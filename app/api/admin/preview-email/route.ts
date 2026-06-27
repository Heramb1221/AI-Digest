// app/api/admin/preview-email/route.ts
// Returns the HTML of a digest email so you can preview it in the browser.
// ADMIN_EMAIL only. Visit: /api/admin/preview-email?type=digest
//
// Useful during development to iterate on email design without
// actually sending emails.

import { NextRequest, NextResponse } from "next/server";
import { auth }   from "@/lib/auth";
import { sendDailyDigestEmail } from "@/lib/email";

const SAMPLE_ARTICLES = [
  {
    title:      "React 20 Introduces Compiler-First Architecture",
    summary:    "The React team has shipped React 20 with a new compiler that eliminates the need for useMemo and useCallback in most codebases. The update brings significant bundle size reductions and improved runtime performance. Developers can upgrade incrementally with full backward compatibility.",
    url:        "https://react.dev/blog/2025/react-20",
    category:   "TECHNICAL",
    importance: 5,
    sourceName: "React Blog",
  },
  {
    title:      "OpenAI Raises $10B at $200B Valuation",
    summary:    "OpenAI has closed another funding round led by SoftBank and Microsoft, pushing its valuation to $200 billion. The capital will fund expansion of compute infrastructure and accelerate research toward AGI. The company now employs over 5,000 people across 12 countries.",
    url:        "https://techcrunch.com/openai-200b",
    category:   "BUSINESS",
    importance: 4,
    sourceName: "TechCrunch",
  },
  {
    title:      "Bun 2.0 Ships Native TypeScript Bundler",
    summary:    "Bun 2.0 has launched with a built-in TypeScript bundler that outperforms esbuild in preliminary benchmarks. The release includes a Jest-compatible test runner and improved Node.js compatibility. Early adopters report 40% faster build times on large monorepos.",
    url:        "https://bun.sh/blog/bun-v2",
    category:   "TOOLS",
    importance: 4,
    sourceName: "Bun.sh",
  },
  {
    title:      "Survey: 78% of Developers Now Use AI Coding Assistants Daily",
    summary:    "Stack Overflow's annual developer survey reveals AI coding assistant adoption has reached 78% among professional developers. GitHub Copilot leads with 45% market share, followed by Cursor at 22%. Productivity gains reported range from 20–40% on routine tasks.",
    url:        "https://stackoverflow.com/survey/2025",
    category:   "TRENDS",
    importance: 3,
    sourceName: "Stack Overflow",
  },
  {
    title:      "EU AI Act Enforcement Begins for High-Risk Systems",
    summary:    "The European Union has begun enforcement of the AI Act for high-risk AI systems, requiring conformity assessments and technical documentation. Companies found non-compliant face fines up to 3% of global annual revenue. Most generative AI providers have updated their terms of service to reflect the new requirements.",
    url:        "https://ec.europa.eu/ai-act-enforcement",
    category:   "NEWS",
    importance: 4,
    sourceName: "EU Commission",
  },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || session.user.email !== adminEmail) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "digest";

  if (type === "digest") {
    // Build the email HTML without sending it — we need to inline the template
    // Since sendDailyDigestEmail sends directly, we replicate its template here
    // for preview. In production, use Resend's preview UI instead.

    // Temporarily capture what would be sent by calling the function but
    // intercepting — simplest approach is to just render equivalent HTML inline.
    const dateStr = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });

    // Import and call the email builder logic directly
    // (We call the real function with a fake address to get the preview)
    const previewHtml = buildPreviewHtml(SAMPLE_ARTICLES, dateStr);

    return new NextResponse(previewHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse("Unknown type", { status: 400 });
}

function buildPreviewHtml(articles: typeof SAMPLE_ARTICLES, dateStr: string): string {
  const grouped = articles.reduce<Record<string, typeof articles>>((acc, a) => {
    acc[a.category] = [...(acc[a.category] ?? []), a];
    return acc;
  }, {});

  const categoryColor: Record<string, string> = {
    TECHNICAL: "#0369a1", BUSINESS: "#854d0e", TRENDS: "#7e22ce",
    TOOLS: "#166534", NEWS: "#c2410c", UNCATEGORISED: "#6b7280",
  };

  const importanceDot = (n: number) => {
    const c: Record<number, string> = { 5: "#ef4444", 4: "#f97316", 3: "#3b82f6", 2: "#94a3b8", 1: "#e2e8f0" };
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c[n]??"#94a3b8"};margin-right:6px;vertical-align:middle;"></span>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Email Preview — ${dateStr}</title>
  <style>body{margin:0;padding:20px;background:#f5f5f5;}</style>
</head>
<body>
  <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:10px 16px;margin-bottom:16px;font-family:sans-serif;font-size:12px;color:#856404;">
    ⚠ Email preview — this is how the digest email looks in a browser. Actual email clients may render differently.
  </div>
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:32px 20px;color:#1a1a1a;background:#fafaf9;border:1px solid #e5e5e3;border-radius:8px;">
    <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin:0 0 4px;">AI Digest</p>
    <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;letter-spacing:-0.3px;">Your Morning Briefing</h1>
    <p style="font-size:13px;color:#9ca3af;margin:0 0 24px;">${dateStr}</p>
    <div style="background:#f0f9ff;border-left:3px solid #3b82f6;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:28px;">
      <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#3b82f6;margin:0 0 6px;">Today's TL;DR</p>
      <p style="font-size:14px;line-height:1.6;color:#1a1a1a;margin:0;">React 20 ships a groundbreaking compiler update, OpenAI hits a $200B valuation in a new funding round, and the EU begins enforcing its AI Act. Developer adoption of AI coding tools has crossed 78% industry-wide, while Bun 2.0 offers a new high-performance TypeScript bundler.</p>
    </div>
    ${Object.entries(grouped).map(([cat, items]) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="padding-bottom:10px;border-bottom:1px solid #e5e5e3;">
          <span style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${categoryColor[cat]??'#6b7280'};">${cat}</span>
        </td></tr>
        ${items.map(a => `
        <tr><td style="padding:14px 0;border-bottom:1px solid #f3f3f1;">
          <p style="margin:0 0 4px;">${importanceDot(a.importance)}<a href="${a.url}" style="font-size:15px;font-weight:600;color:#1a1a1a;text-decoration:none;">${a.title}</a></p>
          <p style="font-size:13px;color:#6b6b6b;line-height:1.6;margin:4px 0 0 14px;">${a.summary}</p>
          <p style="font-size:11px;color:#a3a3a3;margin:4px 0 0 14px;">${a.sourceName}</p>
        </td></tr>`).join("")}
      </table>
    `).join("")}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e3;">
      <tr><td style="font-size:11px;color:#a3a3a3;line-height:1.6;">
        You're getting this because you enabled daily digest emails. <a href="#" style="color:#6b7280;">Unsubscribe</a> · <a href="#" style="color:#6b7280;">Open app</a>
      </td></tr>
    </table>
  </div>
</body>
</html>`;
}
