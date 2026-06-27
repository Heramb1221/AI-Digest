#!/usr/bin/env tsx
// scripts/test-email.ts
// Sends a real test digest email using your Resend credentials.
// Use this to verify email delivery and preview the template in a real inbox.
//
//   Usage:
//     RESEND_API_KEY=re_... npx tsx scripts/test-email.ts you@example.com

import { sendDailyDigestEmail } from "../lib/email";
import { generateTldr }         from "../lib/gemini";

const SAMPLE_ARTICLES = [
  {
    title:      "React 20 Introduces Compiler-First Architecture",
    summary:    "The React team has shipped React 20 with a new compiler that eliminates the need for useMemo and useCallback in most codebases. The update brings significant bundle size reductions and improved runtime performance.",
    url:        "https://react.dev/blog",
    category:   "TECHNICAL",
    importance: 5,
    sourceName: "React Blog (RSS)",
  },
  {
    title:      "OpenAI Raises $10B at $200B Valuation",
    summary:    "OpenAI has closed a new funding round led by SoftBank and Microsoft, pushing its valuation to $200 billion. The capital will fund expansion of compute infrastructure and accelerate research toward AGI.",
    url:        "https://techcrunch.com",
    category:   "BUSINESS",
    importance: 4,
    sourceName: "TechCrunch (RSS)",
  },
  {
    title:      "Bun 2.0 Ships Native TypeScript Bundler",
    summary:    "Bun 2.0 has launched with a built-in TypeScript bundler that outperforms esbuild in preliminary benchmarks. Early adopters report 40% faster build times on large monorepos.",
    url:        "https://bun.sh",
    category:   "TOOLS",
    importance: 4,
    sourceName: "Bun.sh (RSS)",
  },
  {
    title:      "Survey: 78% of Developers Now Use AI Coding Assistants Daily",
    summary:    "Stack Overflow's annual developer survey reveals AI coding assistant adoption has reached 78% among professional developers. GitHub Copilot leads with 45% market share, followed by Cursor at 22%.",
    url:        "https://stackoverflow.com/survey",
    category:   "TRENDS",
    importance: 3,
    sourceName: "Stack Overflow (Reddit)",
  },
  {
    title:      "EU AI Act Enforcement Begins for High-Risk Systems",
    summary:    "The European Union has begun enforcement of the AI Act for high-risk AI systems, requiring conformity assessments and technical documentation. Companies found non-compliant face fines up to 3% of global annual revenue.",
    url:        "https://ec.europa.eu",
    category:   "NEWS",
    importance: 4,
    sourceName: "EU Commission (Scrape)",
  },
];

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes("@")) {
    console.error("Usage: npx tsx scripts/test-email.ts <email>");
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("❌  RESEND_API_KEY not set");
    process.exit(1);
  }

  // Optional: generate a real TL;DR if Gemini key is set
  let tldr: string | undefined;
  if (process.env.GEMINI_API_KEY) {
    console.log("Generating TL;DR with Gemini...");
    tldr = await generateTldr(SAMPLE_ARTICLES.map((a) => a.summary));
    console.log(`TL;DR: ${tldr?.slice(0, 100)}...\n`);
  }

  console.log(`Sending test digest email to ${to}...`);
  const result = await sendDailyDigestEmail(to, "Developer", SAMPLE_ARTICLES, tldr);

  if (result.success) {
    console.log("✓ Email sent successfully! Check your inbox.");
  } else {
    console.error("✗ Email failed:", result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
