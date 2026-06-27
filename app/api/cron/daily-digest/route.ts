// app/api/cron/daily-digest/route.ts
// Triggered daily at 06:00 UTC by Vercel Cron (vercel.json).
//
// Security: Vercel automatically sets the Authorization header on cron
// invocations. We additionally check CRON_SECRET as a belt-and-suspenders
// guard so the endpoint can't be triggered anonymously via the public internet.
//
// Fan-out pattern:
//   - Fetch all users with ≥1 active source
//   - Process in batches of 10 with a 300ms gap between batches
//   - Each user runs independently — one failure doesn't cascade
//   - Returns immediately with a summary; heavy work is already synchronous
//     here because Vercel Cron has a 300s max duration on Pro, 60s on Hobby.
//     For Hobby plan, keep total users × avg_processing_time < 55s.

import { NextRequest, NextResponse } from "next/server";
import { db }                     from "@/lib/db";
import { runDigestForUser }       from "@/lib/digest";
import { runDigestForTeam }       from "@/lib/team-digest";
import { sendDailyDigestEmail }   from "@/lib/email";
import { generateTldr }           from "@/lib/gemini";
import { log }                    from "@/lib/logger";
import type { DigestArticle }     from "@/lib/email";

const BATCH_SIZE       = 10;
const BATCH_DELAY_MS   = 300;

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cronSecret = req.headers.get("x-cron-secret")
                  ?? req.nextUrl.searchParams.get("secret");

  // Vercel also sends Authorization: Bearer <CRON_SECRET> on managed crons
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const secret = cronSecret ?? bearerSecret;

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Load all users with at least one active source ───────────────────────
  const users = await db.user.findMany({
    where:  { sources: { some: { isActive: true } } },
    select: { id: true, geminiApiKey: true },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    return NextResponse.json({ message: "No users to process.", total: 0 });
  }

  // ── Process in batches ───────────────────────────────────────────────────
  let succeeded = 0;
  let failed    = 0;
  const errors: string[] = [];

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const settled = await Promise.allSettled(
      batch.map((u) => runDigestForUser(u.id, u.geminiApiKey))
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        succeeded++;
      } else {
        failed++;
        errors.push(result.reason?.message ?? "Unknown error");
        console.error("[cron] User digest failed:", result.reason);
      }
    }

    // Small delay between batches to avoid DB connection spikes
    if (i + BATCH_SIZE < users.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // ── Run team digests ──────────────────────────────────────────────────────
  const teams = await db.team.findMany({
    where:  { sources: { some: { isActive: true } }, members: { some: {} } },
    select: { id: true },
  });

  let teamSucceeded = 0;
  let teamFailed    = 0;

  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch   = teams.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((t) => runDigestForTeam(t.id))
    );
    for (const r of settled) {
      if (r.status === "fulfilled") teamSucceeded++;
      else { teamFailed++; log.error("cron.team.failed", { error: String(r.reason) }); }
    }
    if (i + BATCH_SIZE < teams.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  // ── Send digest emails to Pro/Team users who have it enabled ────────────────
  let emailsSent = 0;
  const emailUsers = await db.user.findMany({
    where: {
      digestEmailEnabled: true,
      plan:               { in: ["PRO", "TEAM"] },
      sources:            { some: { isActive: true } },
    },
    select: { id: true, email: true, name: true, geminiApiKey: true },
  });

  for (const u of emailUsers) {
    try {
      // Fetch today's new articles (seen in the last 12 hours)
      const since    = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const articles = await db.article.findMany({
        where: {
          seenBy:    { some: { userId: u.id, seenAt: { gte: since } } },
          summary:   { not: null },
        },
        orderBy: [{ importance: "desc" }, { publishedAt: "desc" }],
        take:    30,
        include: { source: { select: { name: true } } },
      });

      if (articles.length === 0) continue;

      const digestArticles: DigestArticle[] = articles.map((a) => ({
        title:      a.title,
        summary:    a.summary ?? "",
        url:        a.url,
        category:   a.category,
        importance: a.importance,
        sourceName: a.source.name,
      }));

      // Generate TL;DR paragraph
      const summaries = digestArticles.slice(0, 10).map((a) => a.summary).filter(Boolean);
      const tldr      = await generateTldr(summaries, u.geminiApiKey);

      const { success } = await sendDailyDigestEmail(
        u.email,
        u.name ?? "there",
        digestArticles,
        tldr
      );

      if (success) emailsSent++;
    } catch (err) {
      console.error(`[cron] Email failed for user ${u.id}:`, err);
    }
  }

  return NextResponse.json({
    message:      "Daily digest complete.",
    total:        users.length,
    succeeded,
    failed,
    teams:        { total: teams.length, succeeded: teamSucceeded, failed: teamFailed },
    emailsSent,
    errors:       errors.slice(0, 10),
    timestamp:    new Date().toISOString(),
  });
}
