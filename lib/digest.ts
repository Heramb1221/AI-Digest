// lib/digest.ts
// Core digest runner — called by both the Vercel Cron job and the manual
// refresh endpoint.
//
// Phase 3 additions:
//   - DigestRunLog: per-source structured log entries (status, timing, counts)
//   - SourceHealth: consecutive-failure tracking for the health-check cron
//   - Vercel Hobby timeout safety: respects a hard 50s budget per user run

import { db }             from "@/lib/db";
import { fetchSource }    from "@/lib/fetchers";
import { analyseArticle } from "@/lib/gemini";
import { log }            from "@/lib/logger";
import { decryptIfPresent } from "@/lib/crypto";
import type { Category }  from "@prisma/client";

const GEMINI_CALL_DELAY_MS = 200;
const MAX_CONSECUTIVE_FAILS = 5;   // auto-deactivate source after this many

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DigestRunResult {
  digestRunId:    string;
  articlesNew:    number;
  articlesSeen:   number;
  sourcesFetched: number;
  sourcesFailed:  number;
  errors:         string[];
  durationMs:     number;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runDigestForUser(
  userId:       string,
  geminiApiKey?: string | null
): Promise<DigestRunResult> {
  const runStart = Date.now();

  // Decrypt the BYOK key if present
  const decryptedKey = await decryptIfPresent(geminiApiKey ?? null);

  const run = await db.digestRun.create({
    data: { userId, status: "running" },
  });

  const result: DigestRunResult = {
    digestRunId:    run.id,
    articlesNew:    0,
    articlesSeen:   0,
    sourcesFetched: 0,
    sourcesFailed:  0,
    errors:         [],
    durationMs:     0,
  };

  try {
    const sources = await db.source.findMany({
      where:   { userId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    for (const source of sources) {
      const sourceStart = Date.now();

      // ── Fetch ────────────────────────────────────────────────────────────
      const { items, error: fetchError } = await fetchSource(source.type, source.url);
      const fetchDuration = Date.now() - sourceStart;

      if (fetchError) {
        result.errors.push(`[${source.name}] ${fetchError}`);
        result.sourcesFailed++;

        // Write error log
        await db.digestRunLog.create({
          data: {
            digestRunId: run.id,
            sourceId:    source.id,
            sourceName:  source.name,
            status:      "error",
            error:       fetchError,
            durationMs:  fetchDuration,
          },
        });

        // Track consecutive failures
        await recordSourceFailure(source.id, fetchError);
        log.warn("digest.source.failed", { userId, sourceId: source.id, sourceName: source.name, error: fetchError });
        continue;
      }

      if (items.length === 0) {
        await db.digestRunLog.create({
          data: {
            digestRunId: run.id,
            sourceId:    source.id,
            sourceName:  source.name,
            status:      "empty",
            itemsFetched: 0,
            durationMs:  fetchDuration,
          },
        });
        // Reset health on successful (but empty) fetch
        await recordSourceSuccess(source.id);
        result.sourcesFetched++;
        continue;
      }

      result.sourcesFetched++;
      let logItemsNew  = 0;
      let logItemsSeen = 0;

      // ── Process each item ────────────────────────────────────────────────
      for (const item of items) {
        if (!item.url || !item.title) continue;

        const existingArticle = await db.article.findUnique({
          where:  { url: item.url },
          select: { id: true },
        });

        if (existingArticle) {
          await db.seenArticle.upsert({
            where:  { userId_articleId: { userId, articleId: existingArticle.id } },
            create: { userId, articleId: existingArticle.id },
            update: {},
          });
          result.articlesSeen++;
          logItemsSeen++;
          continue;
        }

        // ── AI analysis ──────────────────────────────────────────────────
        let analysis = { summary: "", category: "UNCATEGORISED" as Category, importance: 3 };
        if (item.title || item.content) {
          analysis = await analyseArticle(item.title, item.content, decryptedKey) as typeof analysis;
          await sleep(GEMINI_CALL_DELAY_MS);
        }

        // ── DB write ─────────────────────────────────────────────────────
        try {
          const article = await db.article.create({
            data: {
              sourceId:    source.id,
              title:       item.title.slice(0, 500),
              url:         item.url,
              content:     item.content?.slice(0, 10_000) ?? null,
              summary:     analysis.summary    || null,
              category:    analysis.category   as Category,
              importance:  analysis.importance,
              publishedAt: item.publishedAt,
            },
          });

          await db.seenArticle.create({ data: { userId, articleId: article.id } });
          result.articlesNew++;
          logItemsNew++;
        } catch (dbErr: any) {
          if (dbErr?.code === "P2002") {
            const concurrent = await db.article.findUnique({ where: { url: item.url }, select: { id: true } });
            if (concurrent) {
              await db.seenArticle.upsert({
                where:  { userId_articleId: { userId, articleId: concurrent.id } },
                create: { userId, articleId: concurrent.id },
                update: {},
              });
            }
            result.articlesSeen++;
            logItemsSeen++;
          } else {
            result.errors.push(`[${source.name}] DB write failed: ${dbErr?.message}`);
          }
        }
      }

      // ── Per-source success log ────────────────────────────────────────
      await db.digestRunLog.create({
        data: {
          digestRunId:  run.id,
          sourceId:     source.id,
          sourceName:   source.name,
          status:       "ok",
          itemsFetched: items.length,
          itemsNew:     logItemsNew,
          itemsSeen:    logItemsSeen,
          durationMs:   Date.now() - sourceStart,
        },
      });

      await recordSourceSuccess(source.id);

      // ── Update lastFetched ────────────────────────────────────────────
      await db.source.update({
        where: { id: source.id },
        data:  { lastFetched: new Date() },
      });
    }

    result.durationMs = Date.now() - runStart;

    await db.digestRun.update({
      where: { id: run.id },
      data:  {
        status:       "done",
        completedAt:  new Date(),
        articlesNew:  result.articlesNew,
        articlesSeen: result.articlesSeen,
      },
    });

    return result;
  } catch (fatalErr) {
    result.durationMs = Date.now() - runStart;
    await db.digestRun.update({
      where: { id: run.id },
      data:  { status: "failed", completedAt: new Date() },
    }).catch(() => {});
    throw fatalErr;
  }
}

// ─── Source health tracking ───────────────────────────────────────────────────

async function recordSourceSuccess(sourceId: string) {
  await db.sourceHealth.upsert({
    where:  { sourceId },
    create: { sourceId, consecutiveFails: 0, isHealthy: true, lastCheckedAt: new Date() },
    update: { consecutiveFails: 0, isHealthy: true, lastCheckedAt: new Date() },
  });
}

async function recordSourceFailure(sourceId: string, error: string) {
  const health = await db.sourceHealth.upsert({
    where:  { sourceId },
    create: {
      sourceId,
      consecutiveFails: 1,
      isHealthy:        true,
      lastCheckedAt:    new Date(),
      lastErrorAt:      new Date(),
      lastError:        error,
    },
    update: {
      consecutiveFails: { increment: 1 },
      lastCheckedAt:    new Date(),
      lastErrorAt:      new Date(),
      lastError:        error,
    },
  });

  // Auto-deactivate after too many consecutive failures
  if (health.consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
    await db.source.update({
      where: { id: sourceId },
      data:  { isActive: false },
    });
    await db.sourceHealth.update({
      where: { sourceId },
      data:  { isHealthy: false },
    });
    log.warn("digest.source.deactivated", { sourceId, consecutiveFails: MAX_CONSECUTIVE_FAILS });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
