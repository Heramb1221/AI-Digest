#!/usr/bin/env tsx
// scripts/test-cron.ts
// Locally simulates the full daily-digest cron for one or all users.
// Does NOT call the HTTP endpoint — runs the digest logic directly
// so you don't need to deploy to test the cron behaviour.
//
//   Usage:
//     npx tsx scripts/test-cron.ts              # run for all users
//     npx tsx scripts/test-cron.ts <userId>     # run for one user
//     npx tsx scripts/test-cron.ts --dry-run    # fetch only, skip AI + DB writes

import { db }             from "../lib/db";
import { runDigestForUser } from "../lib/digest";

const isDryRun  = process.argv.includes("--dry-run");
const targetId  = process.argv.find((a) => a.startsWith("cl") || a.startsWith("cm")); // cuid prefix

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set");
    process.exit(1);
  }

  if (isDryRun) {
    console.log("⚠  Dry-run mode — AI calls and DB writes are skipped\n");
  }

  let users: { id: string; geminiApiKey: string | null }[];

  if (targetId) {
    const user = await db.user.findUnique({
      where:  { id: targetId },
      select: { id: true, email: true, geminiApiKey: true },
    });
    if (!user) {
      console.error(`❌  User ${targetId} not found`);
      process.exit(1);
    }
    console.log(`Running digest for: ${user.email}\n`);
    users = [user];
  } else {
    users = await db.user.findMany({
      where:  { sources: { some: { isActive: true } } },
      select: { id: true, geminiApiKey: true },
      take:   50, // safety cap for local testing
    });
    console.log(`Running digest for ${users.length} users\n`);
  }

  const BATCH_SIZE     = 5;
  const BATCH_DELAY_MS = 200;
  let succeeded        = 0;
  let failed           = 0;
  const start          = Date.now();

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch   = users.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((u) =>
        isDryRun
          ? dryRunForUser(u.id)
          : runDigestForUser(u.id, u.geminiApiKey)
      )
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        const r = result.value;
        console.log(
          `  ✓ ${r.digestRunId ?? "dry-run"} — ` +
          `${r.articlesNew} new, ${r.articlesSeen} seen, ` +
          `${r.sourcesFetched} sources ok, ${r.sourcesFailed} failed ` +
          `(${r.durationMs}ms)`
        );
        if (r.errors.length > 0) {
          r.errors.forEach((e) => console.log(`    ⚠  ${e}`));
        }
        succeeded++;
      } else {
        console.error(`  ✗ User failed:`, result.reason?.message ?? result.reason);
        failed++;
      }
    }

    if (i + BATCH_SIZE < users.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  Done in ${duration}s — ${succeeded} succeeded, ${failed} failed`);
  console.log("=".repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

// Dry-run: only fetch sources, skip AI + DB
async function dryRunForUser(userId: string) {
  const { fetchSource } = await import("../lib/fetchers");

  const sources = await db.source.findMany({
    where:   { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  let articlesNew    = 0;
  let articlesSeen   = 0;
  let sourcesFetched = 0;
  let sourcesFailed  = 0;
  const errors: string[] = [];
  const start = Date.now();

  for (const source of sources) {
    const { items, error } = await fetchSource(source.type, source.url);
    if (error) {
      errors.push(`[${source.name}] ${error}`);
      sourcesFailed++;
      continue;
    }
    sourcesFetched++;
    articlesNew += items.length; // treat everything as "new" in dry-run
    process.stdout.write(`    [dry] ${source.name}: ${items.length} items\n`);
  }

  return {
    digestRunId:    "dry-run",
    articlesNew,
    articlesSeen,
    sourcesFetched,
    sourcesFailed,
    errors,
    durationMs: Date.now() - start,
  };
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
