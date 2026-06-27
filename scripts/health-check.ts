#!/usr/bin/env tsx
// scripts/health-check.ts
// Hits the /api/health endpoint and all major API surfaces.
// Run as part of post-deployment verification or from an uptime monitor.
//
//   Usage: BASE_URL=https://your-app.vercel.app npx tsx scripts/health-check.ts

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

interface Check {
  name:    string;
  url:     string;
  expect:  (data: any, status: number) => boolean;
}

const CHECKS: Check[] = [
  {
    name:   "Health endpoint",
    url:    "/api/health",
    expect: (data, status) => status === 200 && data.status === "ok",
  },
  {
    name:   "Landing page",
    url:    "/",
    expect: (_, status) => status === 200,
  },
  {
    name:   "Login page",
    url:    "/login",
    expect: (_, status) => status === 200,
  },
  {
    name:   "Signup page",
    url:    "/signup",
    expect: (_, status) => status === 200,
  },
  {
    name:   "API auth guard (should 401)",
    url:    "/api/sources",
    expect: (data, status) => status === 401 && data.error === "Unauthorized",
  },
  {
    name:   "Robots.txt",
    url:    "/robots.txt",
    expect: (_, status) => status === 200,
  },
  {
    name:   "Sitemap.xml",
    url:    "/sitemap.xml",
    expect: (_, status) => status === 200,
  },
];

async function main() {
  console.log(`\nHealth check: ${BASE}\n${"=".repeat(50)}\n`);

  let passed = 0;
  let failed  = 0;

  for (const check of CHECKS) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE}${check.url}`, {
        redirect: "manual",
        headers:  { "Accept": "application/json, text/html" },
      });

      let data: any = {};
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("json")) {
        data = await res.json().catch(() => ({}));
      }

      const ok  = check.expect(data, res.status);
      const ms  = Date.now() - start;

      if (ok) {
        console.log(`  ✓  ${check.name} (${res.status}) ${ms}ms`);
        passed++;
      } else {
        console.log(`  ✗  ${check.name} — unexpected ${res.status} ${ms}ms`);
        console.log(`     Response: ${JSON.stringify(data).slice(0, 100)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ✗  ${check.name} — THREW: ${err}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  ${passed} passed · ${failed} failed`);
  console.log("=".repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main();
