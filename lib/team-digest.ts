// lib/team-digest.ts
// Runs a digest for all members of a team using the team's shared sources.
// Called by the daily cron after per-user runs complete.
//
// Team digest logic:
//   - Fetch all active team sources (not per-user)
//   - For each item: upsert Article globally
//   - Mark as seen for EVERY team member (fan-out)
//   - Write one DigestRunLog per source (tied to the team owner's DigestRun)
//
// This means all team members get the same articles in their digest,
// filtered/sorted individually by their own preferences.

import { db }             from "@/lib/db";
import { fetchSource }    from "@/lib/fetchers";
import { analyseArticle } from "@/lib/gemini";
import { log }            from "@/lib/logger";
import { decryptIfPresent } from "@/lib/crypto";
import type { Category }  from "@prisma/client";

const GEMINI_CALL_DELAY_MS = 200;

export interface TeamDigestResult {
  teamId:         string;
  articlesNew:    number;
  articlesSeen:   number;
  sourcesFetched: number;
  sourcesFailed:  number;
  membersUpdated: number;
  durationMs:     number;
}

export async function runDigestForTeam(teamId: string): Promise<TeamDigestResult> {
  const start = Date.now();

  const result: TeamDigestResult = {
    teamId,
    articlesNew:    0,
    articlesSeen:   0,
    sourcesFetched: 0,
    sourcesFailed:  0,
    membersUpdated: 0,
    durationMs:     0,
  };

  // Load team + members + sources
  const team = await db.team.findUnique({
    where:   { id: teamId },
    include: {
      sources: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      members: { select: { userId: true } },
    },
  });

  if (!team || team.sources.length === 0 || team.members.length === 0) {
    result.durationMs = Date.now() - start;
    return result;
  }

  const memberIds    = team.members.map((m) => m.userId);
  const newArticleIds: string[] = [];

  // Get the team owner's geminiApiKey as fallback
  const owner = await db.teamMember.findFirst({
    where:   { teamId, role: "OWNER" },
    include: { user: { select: { geminiApiKey: true } } },
  });
  const geminiApiKey = await decryptIfPresent(owner?.user.geminiApiKey ?? null);

  for (const source of team.sources) {
    const sourceStart = Date.now();
    const { items, error: fetchError } = await fetchSource(source.type, source.url);

    if (fetchError) {
      result.sourcesFailed++;
      log.warn("team-digest.source.failed", { teamId, sourceId: source.id, error: fetchError });
      continue;
    }

    result.sourcesFetched++;

    for (const item of items) {
      if (!item.url || !item.title) continue;

      // Check global article existence
      let article = await db.article.findUnique({
        where:  { url: item.url },
        select: { id: true },
      });

      if (!article) {
        // New article — analyse with AI
        let analysis = { summary: "", category: "UNCATEGORISED" as Category, importance: 3 };
        try {
          analysis = await analyseArticle(item.title, item.content, geminiApiKey) as typeof analysis;
          await sleep(GEMINI_CALL_DELAY_MS);
        } catch { /* graceful degradation */ }

        try {
          article = await db.article.create({
            data: {
              sourceId:    source.id,
              title:       item.title.slice(0, 500),
              url:         item.url,
              content:     item.content?.slice(0, 10_000) ?? null,
              summary:     analysis.summary  || null,
              category:    analysis.category as Category,
              importance:  analysis.importance,
              publishedAt: item.publishedAt,
            },
            select: { id: true },
          });
          result.articlesNew++;
          newArticleIds.push(article.id);
        } catch (e: any) {
          if (e?.code === "P2002") {
            // Race condition — fetch the existing one
            article = await db.article.findUnique({ where: { url: item.url }, select: { id: true } });
            if (article) result.articlesSeen++;
          }
          continue;
        }
      } else {
        result.articlesSeen++;
      }

      // Mark as seen for all team members (fan-out via createMany + skipDuplicates)
      if (article) {
        await db.seenArticle.createMany({
          data: memberIds.map((userId) => ({
            userId,
            articleId: article!.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update lastFetched
    await db.source.update({
      where: { id: source.id },
      data:  { lastFetched: new Date() },
    });

    log.info("team-digest.source.ok", {
      teamId,
      sourceId:   source.id,
      sourceName: source.name,
      durationMs: Date.now() - sourceStart,
    });
  }

  result.membersUpdated = memberIds.length;
  result.durationMs     = Date.now() - start;

  log.info("team-digest.complete", {
    teamId,
    articlesNew:  result.articlesNew,
    articlesSeen: result.articlesSeen,
    durationMs:   result.durationMs,
  });

  return result;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
