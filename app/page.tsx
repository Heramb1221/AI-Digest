// app/page.tsx — AI Digest landing page
// Design: Editorial newsroom — ink-black canvas, amber accent, monospace timestamps.
// Signature element: animated headline ticker that looks like a live wire.
import Link   from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "AI Digest — Your morning briefing, summarised by AI",
  description: "Add any RSS feed, YouTube channel, or subreddit. Every morning, Gemini AI reads them and delivers a clean, deduplicated digest — grouped by topic, scored by importance.",
  openGraph: {
    title:       "AI Digest",
    description: "Your morning briefing, curated by you, summarised by AI.",
    type:        "website",
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { cat: "TECHNICAL",  title: "React 20 ships compiler-first architecture" },
  { cat: "BUSINESS",   title: "OpenAI raises $10B at $200B valuation"       },
  { cat: "TOOLS",      title: "Bun 2.0 launches native TypeScript bundler"  },
  { cat: "TRENDS",     title: "78% of devs use AI coding tools daily"       },
  { cat: "NEWS",       title: "EU AI Act enforcement begins this month"     },
  { cat: "TECHNICAL",  title: "Postgres 17 cuts vacuum overhead by 60%"    },
  { cat: "TOOLS",      title: "Cursor raises Series B at $9B valuation"    },
  { cat: "BUSINESS",   title: "Anthropic launches Claude for Enterprise"    },
];

const FEATURES = [
  {
    label: "01",
    title: "Every source, one inbox",
    body:  "RSS feeds, YouTube channels, subreddits, newsletters. Add a URL, we handle the rest. Supports OPML bulk import from Feedly, NewsBlur, or Reeder.",
  },
  {
    label: "02",
    title: "AI that reads so you don't have to",
    body:  "Gemini 2.0 Flash generates a 2–3 sentence summary, assigns a category, and scores importance 1–5. Bring your own API key to skip shared quota.",
  },
  {
    label: "03",
    title: "No duplicates. Ever.",
    body:  "Every article you open is tracked per-user. Tomorrow's digest starts where today's ended. Idempotent by design — even across devices.",
  },
  {
    label: "04",
    title: "Your digest is private",
    body:  "No public profiles, no social graph, no tracking pixels. Fully private by default. Teams get a shared workspace with role-based access.",
  },
];

const PRICING = [
  {
    name:  "Free",
    price: "$0",
    sub:   "forever",
    items: [
      "5 sources",
      "Daily AI digest",
      "Auto-categorise",
      "Importance scoring",
    ],
    cta:       "Start reading",
    href:      "/signup",
    highlight: false,
  },
  {
    name:  "Pro",
    price: "$12",
    sub:   "per month",
    items: [
      "50 sources",
      "Custom categories",
      "Bookmarks",
      "Chat with digest",
      "Daily email delivery",
      "API access",
    ],
    cta:       "Upgrade to Pro",
    href:      "/signup",
    highlight: true,
  },
  {
    name:  "Team",
    price: "$29",
    sub:   "per month",
    items: [
      "200 shared sources",
      "Hourly refresh",
      "Team workspace",
      "Role-based access",
      "Priority support",
    ],
    cta:       "Start a workspace",
    href:      "/signup",
    highlight: false,
  },
];

const TECH_STACK = [
  { label: "Next.js 14",     sub: "App Router + RSC" },
  { label: "Neon Postgres",  sub: "Serverless DB"    },
  { label: "Prisma ORM",     sub: "Type-safe queries"},
  { label: "Auth.js v5",     sub: "JWT sessions"     },
  { label: "Gemini 2.0",     sub: "AI summarisation" },
  { label: "Stripe",         sub: "Payments"         },
  { label: "Resend",         sub: "Transactional email"},
  { label: "Vercel Cron",    sub: "Background jobs"  },
];

const CAT_COLORS: Record<string, string> = {
  TECHNICAL: "text-sky-400",
  BUSINESS:  "text-amber-400",
  TRENDS:    "text-violet-400",
  TOOLS:     "text-emerald-400",
  NEWS:      "text-rose-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F0EDE8]" style={{ fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-[#F0EDE8]">AI Digest</span>
            <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-1.5 py-0.5 rounded">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm text-[#9CA3AF] hover:text-[#F0EDE8] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 text-sm font-medium bg-[#F59E0B] text-[#0A0A0A] rounded-lg hover:bg-[#F59E0B]/90 transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Ticker ───────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#0F0F0F] overflow-hidden">
        <div className="flex items-center">
          <span className="shrink-0 px-4 py-2 text-2xs font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/10 border-r border-white/10 tracking-widest uppercase">
            LIVE
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div
              className="flex gap-0 whitespace-nowrap"
              style={{
                animation: "ticker 30s linear infinite",
                willChange: "transform",
              }}
            >
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-6 py-2 border-r border-white/5 text-xs">
                  <span className={`font-mono text-2xs font-semibold uppercase tracking-wider ${CAT_COLORS[item.cat] ?? "text-[#9CA3AF]"}`}>
                    {item.cat}
                  </span>
                  <span className="text-[#D1CBC3]">{item.title}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#F59E0B] mb-6">
          AI-powered news digest
        </p>
        <h1
          className="text-5xl sm:text-6xl font-semibold tracking-tight leading-tight mb-6"
          style={{ letterSpacing: "-0.02em" }}
        >
          Your morning briefing,<br />
          <span className="text-[#9CA3AF]">curated by you.</span>
        </h1>
        <p className="text-[#9CA3AF] text-lg leading-relaxed max-w-xl mx-auto mb-10">
          Add any RSS feed, YouTube channel, or subreddit.
          Every morning, AI reads them and delivers a clean digest —
          grouped, scored, and deduplicated.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="px-6 py-3 font-semibold bg-[#F59E0B] text-[#0A0A0A] rounded-xl hover:bg-[#F59E0B]/90 transition-colors text-sm"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 font-semibold border border-white/20 text-[#F0EDE8] rounded-xl hover:bg-white/5 transition-colors text-sm"
          >
            Sign in
          </Link>
        </div>
        <p className="text-xs text-[#6B7280] mt-4">No credit card required. Free forever.</p>
      </section>

      {/* ── Digest mockup ────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#111111] shadow-2xl">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0D0D0D]">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840]" />
            <span className="ml-3 text-xs font-mono text-[#6B7280]">AI Digest — Dashboard</span>
            <span className="ml-auto text-xs font-mono text-[#F59E0B]">3 new · 06:12 UTC</span>
          </div>
          {/* Mock article rows */}
          <div className="divide-y divide-white/5">
            {[
              { cat: "TECHNICAL", imp: 5, title: "React 20 ships compiler-first architecture — no more useMemo", source: "React Blog", time: "2h ago", color: "bg-red-500" },
              { cat: "TOOLS",     imp: 4, title: "Bun 2.0 launches native TypeScript bundler, 40% faster builds", source: "Bun.sh",   time: "4h ago", color: "bg-orange-500" },
              { cat: "BUSINESS",  imp: 4, title: "OpenAI raises $10B at $200B valuation from SoftBank, Microsoft", source: "TechCrunch", time: "5h ago", color: "bg-orange-500" },
              { cat: "TRENDS",    imp: 3, title: "Survey: 78% of developers now use AI coding assistants daily", source: "Stack Overflow", time: "6h ago", color: "bg-blue-500" },
            ].map((row, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3.5 ${i === 0 ? "bg-[#F59E0B]/5" : ""}`}>
                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${row.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-2xs font-mono font-semibold uppercase tracking-wider ${CAT_COLORS[row.cat]}`}>
                      {row.cat}
                    </span>
                    <span className="text-2xs text-[#4B5563]">·</span>
                    <span className="text-2xs text-[#4B5563]">{row.source}</span>
                    <span className="text-2xs text-[#4B5563] ml-auto">{row.time}</span>
                  </div>
                  <p className={`text-sm leading-snug ${i === 0 ? "text-[#F0EDE8] font-medium" : "text-[#D1CBC3]"}`}>
                    {row.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-white/10 bg-[#0D0D0D] text-center">
            <span className="text-2xs font-mono text-[#4B5563]">↑ 26 articles · 5 sources · next refresh 06:00 UTC</span>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#6B7280] mb-10 text-center">
          How it works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/10">
          {FEATURES.map((f) => (
            <div key={f.label} className="bg-[#0F0F0F] p-7">
              <span className="font-mono text-xs text-[#F59E0B] font-semibold">{f.label}</span>
              <h3 className="text-base font-semibold mt-3 mb-2 text-[#F0EDE8]">{f.title}</h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Source types ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#6B7280] mb-8 text-center">
          Works with any source
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "⬡", label: "RSS / Atom",       sub: "Any blog or podcast" },
            { icon: "▶", label: "YouTube",           sub: "Channel uploads"     },
            { icon: "◎", label: "Reddit",            sub: "Any subreddit"       },
            { icon: "◻", label: "Any webpage",       sub: "Cheerio scraper"     },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="border border-white/10 rounded-xl p-4 bg-[#111111] text-center">
              <span className="text-2xl block mb-2">{icon}</span>
              <p className="text-sm font-medium text-[#F0EDE8]">{label}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#4B5563] mt-4">
          Import existing feeds via OPML from Feedly, NewsBlur, Reeder, or Inoreader
        </p>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#6B7280] mb-3 text-center">
          Pricing
        </p>
        <h2 className="text-2xl font-semibold text-center mb-2 text-[#F0EDE8] tracking-tight">
          Simple, honest pricing
        </h2>
        <p className="text-sm text-[#9CA3AF] text-center mb-10">
          Start free. Upgrade when you need more.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRICING.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 flex flex-col gap-5 ${
                tier.highlight
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/5 ring-1 ring-[#F59E0B]/20"
                  : "border-white/10 bg-[#111111]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[#9CA3AF]">
                    {tier.name}
                  </span>
                  {tier.highlight && (
                    <span className="text-2xs font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-semibold text-[#F0EDE8] tracking-tight">{tier.price}</span>
                  <span className="text-sm text-[#6B7280] mb-0.5">/{tier.sub}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2.5 flex-1">
                {tier.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                    <span className="text-[#F59E0B] shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? "bg-[#F59E0B] text-[#0A0A0A] hover:bg-[#F59E0B]/90"
                    : "border border-white/15 text-[#F0EDE8] hover:bg-white/5"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech stack (portfolio callout) ───────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 border-t border-white/5 pt-20">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#6B7280] mb-8 text-center">
          Built with
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TECH_STACK.map(({ label, sub }) => (
            <div key={label} className="border border-white/8 rounded-xl px-4 py-3 bg-[#0D0D0D] text-center">
              <p className="text-sm font-semibold text-[#F0EDE8]">{label}</p>
              <p className="text-xs text-[#4B5563] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-8 py-10 text-center">
          <h2 className="text-2xl font-semibold text-[#F0EDE8] mb-2 tracking-tight">
            Start your morning smarter
          </h2>
          <p className="text-sm text-[#9CA3AF] mb-6 max-w-sm mx-auto">
            Add your first source in 30 seconds. First digest arrives tomorrow at 06:00 UTC.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 font-semibold bg-[#F59E0B] text-[#0A0A0A] rounded-xl hover:bg-[#F59E0B]/90 transition-colors text-sm"
          >
            Get started — its free
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xs font-mono text-[#4B5563]">
            © {new Date().getFullYear()} AI Digest
          </span>
          <div className="flex items-center gap-6">
            {[
              { label: "GitHub",  href: "https://github.com/your-username/ai-digest" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms",   href: "/terms"   },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="text-xs text-[#4B5563] hover:text-[#9CA3AF] transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
