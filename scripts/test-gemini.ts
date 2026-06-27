#!/usr/bin/env tsx
// scripts/test-gemini.ts
// Verifies Gemini API key works and returns valid structured output.
//
//   Usage: GEMINI_API_KEY=AIza... npx tsx scripts/test-gemini.ts

import { analyseArticle, generateTldr } from "../lib/gemini";

const SAMPLE_ARTICLES = [
  {
    title: "React 20 Introduces Server Actions and Concurrent Suspense Boundaries",
    content: "The React team has released React 20 with major improvements to server-side rendering. The new Server Actions feature allows developers to write server-side code directly in React components without API routes. Concurrent Suspense Boundaries improve loading states for async data. The release also includes a new compiler that eliminates the need for useMemo and useCallback in most cases.",
  },
  {
    title: "OpenAI Raises $6.6 Billion at $157 Billion Valuation",
    content: "OpenAI has completed its latest funding round, raising $6.6 billion from investors including Microsoft, SoftBank, and Tiger Global. The round values the company at $157 billion, making it one of the most valuable private companies in history. The funding will be used to expand compute infrastructure and accelerate AGI research.",
  },
  {
    title: "Bun 2.0 Ships with Native TypeScript Bundler",
    content: "The Bun JavaScript runtime has released version 2.0 featuring a native TypeScript bundler that outperforms esbuild in benchmarks. The new bundler produces smaller output and supports tree-shaking for TypeScript decorators. Bun 2.0 also ships with a built-in test runner compatible with Jest's API and improved compatibility with Node.js modules.",
  },
];

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌  GEMINI_API_KEY not set. Run: GEMINI_API_KEY=AIza... npx tsx scripts/test-gemini.ts");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("  AI Digest — Gemini Smoke Tests");
  console.log("=".repeat(60) + "\n");

  const summaries: string[] = [];
  let passed = 0;
  let failed  = 0;

  for (const article of SAMPLE_ARTICLES) {
    console.log(`  Analysing: "${article.title.slice(0, 50)}..."`);

    const start = Date.now();
    const result = await analyseArticle(article.title, article.content);
    const ms     = Date.now() - start;

    if (!result.summary) {
      console.log(`  ✗  No summary returned (${ms}ms)\n`);
      failed++;
      continue;
    }

    const validCategories = ["TECHNICAL", "BUSINESS", "TRENDS", "TOOLS", "NEWS", "UNCATEGORISED"];
    const validCategory   = validCategories.includes(result.category);
    const validImportance = result.importance >= 1 && result.importance <= 5;

    if (validCategory && validImportance) {
      console.log(`  ✓  ${ms}ms`);
      console.log(`     Category:   ${result.category}`);
      console.log(`     Importance: ${result.importance}/5`);
      console.log(`     Summary:    ${result.summary.slice(0, 120)}...`);
      summaries.push(result.summary);
      passed++;
    } else {
      console.log(`  ✗  Invalid output (category: ${result.category}, importance: ${result.importance})`);
      failed++;
    }
    console.log();
  }

  // Test TL;DR generation
  if (summaries.length > 0) {
    console.log("  Generating TL;DR from summaries...");
    const start = Date.now();
    const tldr  = await generateTldr(summaries);
    const ms    = Date.now() - start;

    if (tldr) {
      console.log(`  ✓  TL;DR generated (${ms}ms)`);
      console.log(`     ${tldr.slice(0, 200)}...`);
      passed++;
    } else {
      console.log(`  ✗  TL;DR generation failed`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
