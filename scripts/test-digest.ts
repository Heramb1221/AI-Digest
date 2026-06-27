#!/usr/bin/env tsx
// scripts/test-digest.ts
// End-to-end test of the full digest pipeline for a single user.
// Requires DATABASE_URL and GEMINI_API_KEY to be set.
//
//   Usage: npx tsx scripts/test-digest.ts <userId>
//   Example: npx tsx scripts/test-digest.ts clxyz123

import { runDigestForUser } from "../lib/digest";

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error("Usage: npx tsx scripts/test-digest.ts <userId>");
    console.error("\nGet a userId by running: npm run db:studio → Users table");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set.");
    process.exit(1);
  }

  console.log(`\nRunning digest for user: ${userId}`);
  console.log("This may take 30-90 seconds depending on number of sources...\n");

  const start = Date.now();

  try {
    const result = await runDigestForUser(userId);
    const ms     = Date.now() - start;

    console.log("=".repeat(50));
    console.log("  Digest complete!");
    console.log("=".repeat(50));
    console.log(`  Duration:        ${(ms / 1000).toFixed(1)}s`);
    console.log(`  New articles:    ${result.articlesNew}`);
    console.log(`  Already seen:    ${result.articlesSeen}`);
    console.log(`  Sources fetched: ${result.sourcesFetched}`);
    console.log(`  Sources failed:  ${result.sourcesFailed}`);

    if (result.errors.length > 0) {
      console.log("\n  Errors:");
      result.errors.forEach((e) => console.log(`    ⚠  ${e}`));
    }

    console.log("=".repeat(50));
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
