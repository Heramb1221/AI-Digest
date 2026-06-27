#!/usr/bin/env tsx
// scripts/test-fetchers.ts
// Quick smoke test — run locally to verify all fetchers work before deploying.
//
//   Usage: npx tsx scripts/test-fetchers.ts
//
// Output: shows how many items each fetcher returned, the first item's
// title/url, and any errors. Does NOT call Gemini — purely fetch logic.

import { fetchRSS }     from "../lib/fetchers/rss";
import { fetchYouTube } from "../lib/fetchers/youtube";
import { fetchReddit }  from "../lib/fetchers/reddit";
import { fetchScrape }  from "../lib/fetchers/scrape";

// ── Test URLs ────────────────────────────────────────────────────────────────
const TESTS = [
  // RSS
  {
    label: "RSS — TechCrunch",
    fn:    () => fetchRSS("https://techcrunch.com/feed/"),
  },
  {
    label: "RSS — Hacker News (Y Combinator)",
    fn:    () => fetchRSS("https://news.ycombinator.com/rss"),
  },
  {
    label: "RSS — The Verge",
    fn:    () => fetchRSS("https://www.theverge.com/rss/index.xml"),
  },
  // Reddit
  {
    label: "Reddit — r/programming",
    fn:    () => fetchReddit("https://www.reddit.com/r/programming"),
  },
  {
    label: "Reddit — r/MachineLearning",
    fn:    () => fetchReddit("r/MachineLearning"),
  },
  // Scrape
  {
    label: "Scrape — Hacker News",
    fn:    () => fetchScrape("https://news.ycombinator.com"),
  },
];

// YouTube requires a live API key — skip if not set
if (process.env.YOUTUBE_API_KEY) {
  TESTS.push({
    label: "YouTube — Fireship",
    fn:    () => fetchYouTube("https://youtube.com/@Fireship"),
  });
} else {
  console.log("⚠  YOUTUBE_API_KEY not set — skipping YouTube test\n");
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  AI Digest — Fetcher Smoke Tests");
  console.log("=".repeat(60) + "\n");

  let passed = 0;
  let failed  = 0;

  for (const test of TESTS) {
    process.stdout.write(`  ${test.label} ... `);

    const start = Date.now();
    try {
      const result = await test.fn();
      const ms     = Date.now() - start;

      if (result.error && result.items.length === 0) {
        console.log(`✗  ERROR (${ms}ms)`);
        console.log(`     ${result.error}`);
        failed++;
      } else {
        console.log(`✓  ${result.items.length} items (${ms}ms)`);
        if (result.items[0]) {
          console.log(`     First: "${result.items[0].title.slice(0, 60)}..."`);
          console.log(`     URL:   ${result.items[0].url.slice(0, 80)}`);
        }
        if (result.error) {
          console.log(`     ⚠  Warning: ${result.error}`);
        }
        passed++;
      }
    } catch (err) {
      const ms = Date.now() - start;
      console.log(`✗  THREW (${ms}ms)`);
      console.log(`     ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    console.log();
  }

  console.log("=".repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
