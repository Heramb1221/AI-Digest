# AI Digest

> Your morning briefing, curated by you, summarised by AI.

A full-stack SaaS platform where users add RSS feeds, YouTube channels, subreddits,
and newsletters into a single inbox. Every morning, a background job fetches new
content, uses Gemini 2.0 Flash to produce a 2–3 sentence summary per article,
deduplicates against already-seen items, and presents everything in a clean
sidebar-reader interface.

**Built as an engineering portfolio project.** Every architectural decision is
documented with trade-off reasoning for technical interviews.

---

## Live demo

`https://ai-digest.vercel.app` · [GitHub](https://github.com/your-username/ai-digest)

---

## Tech stack

| Layer            | Technology                                   |
|------------------|----------------------------------------------|
| Framework        | Next.js 14 (App Router, RSC)                |
| Database         | Neon (serverless Postgres)                   |
| ORM              | Prisma 5                                     |
| Auth             | Auth.js v5 — email + password + JWT          |
| AI               | Google Gemini 2.0 Flash (BYOK supported)     |
| Payments         | Stripe — Checkout, Portal, Webhooks          |
| Email            | Resend                                       |
| Background jobs  | Vercel Cron (2 crons: digest + health check) |
| Styling          | Tailwind CSS + Radix UI primitives           |
| Deployment       | Vercel                                       |

---

## Features

### Core
- **Multi-source ingestion** — RSS/Atom, YouTube channels, Reddit, arbitrary webpage scrape
- **AI summarisation** — Gemini 2.0 Flash: 2–3 sentence summary, category label, importance score (1–5)
- **Zero duplicates** — `Article.url @unique` (global) + `SeenArticle(userId, articleId)` (per-user)
- **BYOK** — users supply their own Gemini API key (encrypted at rest)
- **OPML import** — bulk import from Feedly, NewsBlur, Reeder (drag-and-drop UI)

### Dashboard
- Sidebar + reader layout (email-client style)
- Category filter bar, source sidebar, infinite scroll
- AI chat panel — ask questions about your digest (Pro)
- Bookmark articles for later (Pro)
- Regenerate summaries on demand (Pro)

### Teams
- Shared source library with OWNER / ADMIN / MEMBER roles
- Invite-token flow (7-day expiry, single-use, email delivery)
- Team digest fan-out: one AI call per article, seen-marked for all members

### SaaS & payments
- Freemium: Free → Pro ($12/mo) → Team ($29/mo)
- Stripe Checkout, Billing Portal, Webhook handling (idempotent)
- Referral system: invite a friend, both get one free month via `trial_end` extension

### Observability
- `DigestRun` + `DigestRunLog` per-source structured logs
- `SourceHealth` auto-deactivates sources after 5 consecutive failures
- Source-health cron: re-tests deactivated sources, sends recovery emails
- Admin dashboard at `/admin` (ADMIN_EMAIL only)

### Email
- Daily digest email (HTML template, importance dots, TL;DR paragraph)
- Source deactivation alert
- Source recovery notification
- Team invite

---

## Local setup

```bash
# 1. Clone and install
git clone https://github.com/your-username/ai-digest
cd ai-digest
bash scripts/setup.sh

# 2. Fill in credentials
cp .env.example .env.local
# Required minimum: DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, GEMINI_API_KEY

# 3. Push schema to database
npm run db:push

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run typecheck        # TypeScript type check
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Prisma Studio (DB browser)

# Testing
npm run test:fetchers    # Smoke-test all four feed fetchers
npm run test:gemini      # Verify Gemini API key + output schema
npm run test:digest      # Full end-to-end digest run for a user
npm run test:cron:dry    # Fetch all sources, skip AI + DB writes
npm run test:cron        # Full cron simulation against DB
npm run test:email       # Send a test digest email to yourself
npm run test:team        # Validate team invite token flow
```

---

## Project structure

```
ai-digest/
├── app/
│   ├── (auth)/              # login, signup, accept-invite
│   ├── (app)/               # authenticated shell
│   │   ├── dashboard/       # sidebar + reader UI
│   │   ├── onboarding/      # 3-step new-user wizard
│   │   ├── settings/        # profile, sources, AI key, billing, referrals
│   │   ├── team/            # team workspace (members, sources, invites)
│   │   └── admin/           # internal metrics dashboard
│   ├── api/                 # 20+ route handlers
│   │   ├── auth/            # NextAuth + register
│   │   ├── sources/         # CRUD, OPML import
│   │   ├── articles/        # list, seen, bookmark
│   │   ├── digest/          # run, status, history
│   │   ├── cron/            # daily-digest, source-health
│   │   ├── stripe/          # checkout, portal, webhook
│   │   ├── ai/              # chat, regen summary
│   │   ├── team/            # create, invite, accept, members, sources
│   │   ├── referral/        # stats, apply
│   │   └── user/            # settings
│   ├── privacy/             # Privacy policy
│   ├── terms/               # Terms of service
│   └── page.tsx             # Landing page
├── components/
│   ├── dashboard/           # ArticleList, ReaderPane, ChatPanel, DigestHeader, …
│   ├── layout/              # AppShell (sidebar + content)
│   ├── shared/              # ThemeProvider
│   └── ui/                  # Button, Input, Badge, Dialog, Toaster, …
├── hooks/
│   ├── use-articles.ts      # paginated article fetching with filter state
│   └── use-digest-status.ts # polls digest run status during refresh
├── lib/
│   ├── auth.ts              # Auth.js v5 config (credentials + JWT)
│   ├── db.ts                # Prisma singleton
│   ├── digest.ts            # per-user digest runner
│   ├── team-digest.ts       # team source fan-out runner
│   ├── gemini.ts            # AI summarisation + TL;DR
│   ├── plan.ts              # PLAN_LIMITS, requirePlan(), planError()
│   ├── stripe.ts            # Stripe client
│   ├── email.ts             # Resend: digest + alert + invite templates
│   ├── logger.ts            # structured JSON logger (dev: coloured console)
│   ├── utils.ts             # cn(), formatDate(), CATEGORY_META
│   └── fetchers/            # rss, youtube, reddit, scrape, index
├── prisma/schema.prisma     # complete data model (14 models)
├── docs/
│   ├── INTERVIEW_PREP.md    # STAR stories, Q&A, system design walkthrough
│   ├── DEPLOYMENT.md        # step-by-step Vercel + Neon deployment
│   └── ARCHITECTURE.md      # deep design decision notes
├── scripts/                 # test-fetchers, test-gemini, test-digest, test-cron, …
├── middleware.ts            # JWT-based route protection (no DB queries)
├── vercel.json              # 2 cron jobs: 06:00 + 08:00 UTC
└── types/index.ts           # shared TypeScript types
```

---

## Architecture decisions

### Deduplication
Two-layer model: `Article.url @unique` (global — one Gemini call per article, ever)
+ `SeenArticle(userId, articleId) @@unique` (per-user — never show the same article twice).
At 50 users all following TechCrunch, I call Gemini once per article, not 50 times.

### Feature gating
`lib/plan.ts` exports `requirePlan('PRO')` — a throw-based guard called at the top
of every premium API route. Converts to a typed 403 with `{ upgrade: true }` that
the frontend uses to render upgrade modals. Client-side gates are UI polish only;
the server is the authority.

### Background jobs
Vercel Cron fires `Promise.allSettled` over batches of 10 users — one failure never
cascades. Manual refreshes return 202 immediately and run async so the UI isn't
blocked. The known trade-off (60s Hobby timeout) is documented: the correct v2
solution is Upstash QStash for per-user job dispatch.

### Stripe webhooks
Three-layer idempotency: (1) signature verification, (2) check DB state before
writing, (3) unique constraint on `ReferralReward.refereeId` prevents double-credit.

### Team fan-out
Team digest uses `seenArticle.createMany({ skipDuplicates: true })` to bulk-insert
seen records for all N members after one fetch + one AI call. O(sources) not
O(members × sources).

---

## Development phases

| Phase | Status | Scope |
|-------|--------|-------|
| 0 | ✅ | Bootstrap, auth, schema, middleware, settings, landing |
| 1 | ✅ | Feed fetchers, Gemini, digest runner, all API routes, Stripe, email |
| 2 | ✅ | Dashboard sidebar+reader, article list, chat panel |
| 3 | ✅ | Cron observability, DigestRunLog, SourceHealth, admin dashboard |
| 4 | ✅ | Full teams (create, invite tokens, roles, shared sources), OPML UI |
| 5 | ✅ | Landing page, legal pages, interview prep docs, deployment guide |

---

## Environment variables

See [`.env.example`](.env.example) for the full list with setup instructions.

Minimum to run locally:
```
DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, GEMINI_API_KEY
```

---

## Interview resources

- [`docs/INTERVIEW_PREP.md`](docs/INTERVIEW_PREP.md) — STAR stories, Q&A, two-minute summary
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — deep design decision rationale
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — step-by-step production deployment

---

## Cost at zero users

| Service | Free allowance | Usage |
|---------|---------------|-------|
| Neon | 10 GB / 100 compute hrs | ~100 MB/day |
| Vercel Hobby | 2 crons, 100 GB bandwidth | 2 crons/day |
| Gemini 2.0 Flash | 1,500 req/day | ~50 articles × N users |
| YouTube Data API | 10,000 units/day | 100 units/channel fetch |
| Resend | 100 emails/day | 1 per user per day |
| Stripe | 2.9% + 30¢/transaction | Pay-as-you-go |

**Fixed monthly cost at 0 paying users: $0**

---

*Portfolio project by Heramb Chaudhari*
