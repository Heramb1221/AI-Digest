# AI Digest — Interview Preparation Guide

> This document prepares you to talk confidently about every engineering decision
> in the project. Cover it once before each interview. The goal is not to memorise
> answers but to own the reasoning behind every choice.

---

## 1. Two-Minute Project Summary (memorise this)

"I built AI Digest — a full-stack SaaS platform where users add RSS feeds, YouTube
channels, subreddits, or any webpage, and every morning a background job fetches
everything, runs each article through Gemini 2.0 Flash for a 2–3 sentence summary,
groups by category, deduplicates against seen articles, and delivers a clean
sidebar-reader dashboard. Users can bring their own Gemini API key, chat with their
digest, get a daily email digest, and teams can share a source library with
role-based access. Monetised with Stripe at $12/month Pro. Built with Next.js 14,
Neon, Prisma, Auth.js v5, and deployed on Vercel."

**Pause. Let them ask.**

---

## 2. System Design Walkthrough

### The request lifecycle (data flow)

```
User adds source
      │
      ▼
POST /api/sources ──► validateRSSFeed() ──► db.source.create()
                           (live test)

Vercel Cron 06:00 UTC
      │
      ▼
GET /api/cron/daily-digest
      │
      ├── db.user.findMany({ sources: some active })
      │
      ├── Batch(10 users, 300ms gap)
      │         │
      │         ├── fetchSource(type, url)      ← RSS / YouTube / Reddit / Scrape
      │         │
      │         ├── for each item:
      │         │     ├── article.findUnique(url)     ← global dedup
      │         │     ├── if new: analyseArticle()    ← Gemini call
      │         │     ├── article.create()
      │         │     └── seenArticle.upsert()        ← per-user dedup
      │         │
      │         └── digestRun.update(done, stats)
      │
      └── sendDailyDigestEmail() for Pro users (Resend)
```

### The deduplication model

Two constraints work together:

1. `Article.url` — `@unique` — global. Same article fetched from two users'
   sources is only stored once, with one Gemini call.

2. `SeenArticle(userId, articleId)` — `@@unique([userId, articleId])` — per-user.
   Once a user has seen an article, it never re-appears.

**Interview insight:** "The unique constraint on Article.url means I'm paying one
Gemini API call per article globally, not per user. At 50 users all following
TechCrunch, I call Gemini once for each article, not 50 times."

### Fan-out for teams

For teams, I do a single fetch of team sources, then use `createMany +
skipDuplicates` to create SeenArticle rows for all N members:

```
fetchSource() once
    │
    ▼
article.create() once
    │
    ▼
seenArticle.createMany([{userId: member1}, {userId: member2}, ...])
    skipDuplicates: true
```

"This is O(sources) not O(members × sources). A team with 20 members following
50 sources does 50 fetches + 50 Gemini calls, not 1000."

---

## 3. Key Technical Decisions + Reasoning

### Why Neon over Supabase?

"I wanted serverless Postgres without vendor lock-in on auth. Neon gives me 10GB
free storage and connection pooling via PgBouncer. Supabase bundles auth and
storage which I didn't need — I'm using Auth.js directly. Avoiding Supabase also
means I own the auth logic, which is more interesting to talk about in interviews."

### Why Vercel Cron over Trigger.dev or Upstash?

"Zero additional services at zero cost. The trade-off is a 60-second execution
limit on Vercel Hobby. I mitigate this by: (1) firing per-user runs as async
Promises with allSettled so one failure doesn't cascade; (2) batching in groups
of 10 with 300ms gaps to avoid DB connection spikes; (3) returning 202 immediately
for manual refreshes so the user doesn't wait.

The correct v2 solution is Upstash QStash — dispatch one job message per user,
each with its own timeout budget. I'd build that if this hit 500+ daily active
users."

### Why Gemini 2.0 Flash over GPT-4o?

"Free tier: 1,500 requests/day at no cost. GPT-3.5 has no free tier. At 50
articles/run × 20 users = 1,000 Gemini calls, I'm still comfortably within the
free limit. I also expose BYOK so power users bring their own key — that shifts
my marginal AI cost to zero for those users."

### Why JWT sessions (not database sessions)?

"Middleware needs to check auth on every request without a DB round-trip. With
JWT I verify the token signature in memory and read `user.plan` from the token
payload — that's the plan gate check. With database sessions I'd need a DB query
per request just to read the plan. The trade-off is that token revocation requires
waiting for JWT expiry (1 day), which is acceptable for this use case."

### Why feature gating via `requirePlan()` in API routes?

"I wanted the gate to be impossible to bypass. Any client-side gate (hiding a
button in React) is trivially bypassed. My `requirePlan('PRO')` call is the first
thing every premium API route does — it throws a typed error that converts to a
403 with `{ upgrade: true }`. The frontend uses that flag to show an upgrade modal
rather than a generic error."

### Webhook idempotency

"Stripe can deliver the same webhook event more than once. My handler checks
database state before writing — if the user is already on PRO when we receive
`checkout.session.completed`, the update is a no-op. I also verify the
`stripe-signature` header before any processing, rejecting anything unsigned."

---

## 4. STAR Stories (Situation → Task → Action → Result)

### Story 1: Designing the deduplication system

**Situation:** The naive approach would mark articles as seen in a simple boolean
column on Article, but with multiple users, that doesn't work — user A seeing an
article shouldn't affect user B.

**Task:** Design a deduplication model that prevents duplicates per-user while
keeping a single global article store to avoid redundant Gemini API calls.

**Action:** Created a `SeenArticle` join table with a `@@unique([userId,
articleId])` constraint. The Article table uses `@unique` on `url` to ensure
global deduplication. The digest runner does `upsert` on both — so even if the
cron fires twice, no article appears twice and no Gemini call fires twice for
the same URL.

**Result:** Zero duplicate articles in production. Gemini cost scales with unique
articles, not user count. Race conditions (two cron workers hitting the same URL)
are handled by catching Prisma P2002 unique constraint violations and gracefully
falling through to the seen-mark step.

### Story 2: Building the team source fan-out

**Situation:** Team users share a source library. When a new article arrives, all
N team members need a SeenArticle row so it appears in everyone's digest.

**Task:** Implement this without N × M database round-trips.

**Action:** Instead of looping over each member and inserting a SeenArticle row
individually, I used `db.seenArticle.createMany({ data: memberIds.map(...),
skipDuplicates: true })`. This fires a single bulk INSERT with conflict handling
at the DB level.

**Result:** A team with 20 members gets one INSERT per article instead of 20.
The `skipDuplicates` flag means re-running the cron for the same article is safe.

### Story 3: Handling Vercel's 60-second timeout

**Situation:** Vercel Hobby plan limits function execution to 60 seconds. My cron
needs to process potentially hundreds of users, each with multiple sources and
Gemini calls.

**Task:** Make the cron robust within the timeout constraint.

**Action:** Structured the cron as a fan-out: load all users, batch into groups
of 10, process each batch with `Promise.allSettled` (one failure doesn't stop
others), add 300ms between batches to avoid DB connection spikes. For manual
refreshes, respond 202 immediately and run the job asynchronously in the background.
Added a `DigestRun` record with `status: "running"` so the UI can poll for
completion.

**Result:** The cron handles ~50 users within the 60s budget. The correct v2
solution (which I'd build at scale) is per-user job dispatch via Upstash QStash,
giving each user its own timeout budget.

### Story 4: Source health auto-deactivation

**Situation:** A user's RSS feed URL changes. The source silently fails, the user
never notices, and their digest becomes stale.

**Task:** Detect and communicate source failures proactively.

**Action:** Added a `SourceHealth` model tracking `consecutiveFails` per source.
After 5 consecutive failures, the source is automatically deactivated and an email
is sent via Resend. A second daily cron (`source-health`) re-tests all deactivated
sources — if they recover, they're reactivated and the user is notified. The
`DigestRunLog` table gives users per-source error visibility in Settings → Sources.

**Result:** Users are informed within 24 hours of a broken feed. Sources recover
automatically without user intervention in the common case (e.g. temporary 5xx).

### Story 5: Stripe webhook safety

**Situation:** Stripe can deliver webhooks multiple times. A naive implementation
might double-upgrade a user or double-credit a referral reward.

**Task:** Make the webhook handler safe to call multiple times with the same event.

**Action:** Three layers of safety: (1) Verify `stripe-signature` header — reject
unsigned payloads with 400. (2) Check current database state before writing —
`user.plan = 'PRO'` already? Skip. (3) `ReferralReward` has a `@@unique` on
`refereeId` — attempting to insert a duplicate throws a P2002 which I catch and
ignore.

**Result:** The webhook handler is fully idempotent. Re-delivering any event
produces the same database state as delivering it once.

---

## 5. Common Interview Questions

### "What's the biggest architectural trade-off you made?"

"Vercel Cron over a proper job queue. Vercel Cron is zero infrastructure at zero
cost, but it has a 60s timeout and limited retry logic. The correct production
answer is Upstash QStash or Trigger.dev — dispatch one job per user, each with
its own timeout and dead-letter queue. I documented this explicitly in the codebase
as a v2 improvement, which shows I understand the trade-off rather than not knowing
about it."

### "How would you scale this to 10,000 users?"

"Four changes: (1) Move from Vercel Cron to a proper queue (Upstash QStash) so
each user's run has its own timeout budget and retry policy. (2) Add a Redis
cache (Upstash) for article deduplication lookups — currently I query Postgres
for every URL, which gets expensive. (3) Move Gemini calls to a worker pool with
rate limiting per API key. (4) Add a CDN layer for the article list API — most
reads are identical across users with the same sources, cacheable at the edge."

### "Why not use Supabase's built-in realtime?"

"I considered it for live digest status updates (the 'Refreshing…' indicator).
I chose polling over websockets because the polling interval is 3 seconds and
the status changes infrequently — websocket overhead wasn't justified. Polling
also works better with Vercel's serverless model where persistent connections
are expensive. If I needed sub-second updates (like a live feed), I'd use
Server-Sent Events or Supabase Realtime."

### "How do you handle the case where Gemini is down?"

"Graceful degradation. The `analyseArticle()` function wraps the Gemini call in
try/catch and returns a safe fallback: `{ summary: '', category: 'UNCATEGORISED',
importance: 3 }`. The article is still saved without a summary — users see 'No
summary available' in the reader pane. They can manually trigger regeneration
later (Pro feature). The digest run completes even if every AI call fails."

### "What would you test first if you had time?"

"Three things in order: (1) The deduplication logic — property-based tests with
Prisma's mock client, covering concurrent inserts and the P2002 race condition.
(2) The OPML parser — fuzz testing with malformed XML, deeply nested outlines,
and missing xmlUrl attributes. (3) The Stripe webhook handler — mock events for
each type, verify idempotency by replaying the same event twice."

### "How does your auth work?"

"Auth.js v5 with the credentials provider. On sign-in, `bcrypt.compare` validates
the password against the stored hash (cost factor 12). On success, Auth.js issues
a JWT containing `{ id, plan }`. The JWT is verified by my middleware on every
request — no DB query needed for auth. The `plan` field in the JWT means premium
feature checks are instant. The JWT expires every 24 hours; the session is
refreshed transparently on the next page load."

### "Why did you pick this stack for a portfolio project?"

"Strategic choices: Next.js 14 with App Router is what most companies are hiring
for right now. Neon is the serverless Postgres pattern everyone is adopting.
Auth.js v5 is more complex than Clerk but shows I understand sessions, JWTs, and
adapters. Stripe integration is a standard senior-engineer expectation. Gemini
instead of OpenAI is a cost decision I can explain — and BYOK shows I thought
about cost at scale. The combination hits every senior-interview topic: auth,
background jobs, payments, AI, observability."

---

## 6. Architecture Diagram (ASCII)

```
Browser
  │
  ├── Next.js App Router (Vercel)
  │     ├── / ─── Landing page (static)
  │     ├── /dashboard ─── DashboardClient (RSC + client)
  │     ├── /settings/* ─── Settings pages
  │     └── /api/* ─── Route handlers
  │
  ├── Auth.js v5 (JWT, email+password)
  │     └── Middleware — verifies JWT on every request
  │
  ├── Neon (serverless Postgres)
  │     └── Prisma ORM — type-safe queries
  │         ├── User, Source, Article, SeenArticle
  │         ├── DigestRun, DigestRunLog, SourceHealth
  │         ├── Team, TeamMember, TeamInvite
  │         └── ReferralReward
  │
  ├── Vercel Cron
  │     ├── 06:00 UTC — /api/cron/daily-digest
  │     │     ├── fetchSource() × all active sources
  │     │     ├── analyseArticle() × new articles (Gemini)
  │     │     └── sendDailyDigestEmail() × Pro users (Resend)
  │     └── 08:00 UTC — /api/cron/source-health
  │           ├── Re-test unhealthy sources
  │           └── Purge old DigestRunLog entries
  │
  ├── Google Gemini 2.0 Flash
  │     ├── Platform key (shared quota)
  │     └── BYOK (user-supplied, AES-256 encrypted)
  │
  ├── Stripe
  │     ├── Checkout Sessions (plan upgrades)
  │     ├── Billing Portal (self-service)
  │     └── Webhooks → sync plan changes
  │
  └── Resend
        ├── Daily digest emails (Pro/Team)
        ├── Source deactivation alerts
        └── Team invite emails
```

---

## 7. Numbers to Know

| Metric | Value |
|--------|-------|
| Gemini free tier | 1,500 req/day |
| Gemini cost at 50 users × 50 articles | ~2,500 req/day → ~$0.05/day |
| Neon free storage | 10 GB |
| Vercel Hobby cron limit | 2 crons/day |
| Vercel function timeout (Hobby) | 60 seconds |
| bcrypt cost factor | 12 (~300ms/hash) |
| JWT expiry | 24 hours |
| Source auto-deactivation | 5 consecutive failures |
| DigestRunLog retention | 30 days |
| DigestRun retention | 90 days |
| Team invite TTL | 7 days |

---

## 8. What to Have Open During a Technical Screen

1. `lib/digest.ts` — the core runner, shows batching, error handling, P2002 catch
2. `prisma/schema.prisma` — full data model, indexes, unique constraints
3. `lib/plan.ts` — feature gating pattern
4. `app/api/stripe/webhook/route.ts` — idempotency and signature verification
5. `lib/gemini.ts` — graceful degradation, model caching, JSON mode
6. `middleware.ts` — JWT-based route protection without DB queries

---

## 9. One-Line Answers for Rapid-Fire Questions

| Question | Answer |
|----------|--------|
| How do you prevent SQL injection? | Prisma uses parameterised queries — I never write raw SQL |
| How do you store passwords? | bcrypt hash (cost 12), never plaintext |
| How do you encrypt the API key? | AES-256 in the DB, `ENCRYPTION_KEY` env var |
| How do you prevent CSRF? | Auth.js handles it; no custom forms touch cookies directly |
| What's your DB index strategy? | Index every foreign key and every field used in `where` clauses |
| How does Stripe know which user paid? | `subscription_data.metadata.userId` passed through Checkout |
| What happens if the cron fails mid-way? | Each user run is independent; `DigestRun.status = "failed"` marks the failure |
| How do you avoid re-summarising articles? | `Article.url @unique` — once inserted, `upsert` skips the AI call |
| Can users export their data? | `GET /api/user/export` returns JSON (GDPR compliant) |
| How are BYOK keys stored? | AES-256-GCM encrypted, IV prepended, never returned via API |
| How does password reset work? | Single-use cuid token, 1hr TTL, `$transaction` on consume |
| How do you prevent user enumeration in forgot-password? | Always return 200 regardless of email existence |

---

## 10. Phases 7–9 — Extra Interview Points

### "Walk me through how you encrypt the BYOK API keys."

"I use AES-256-GCM via the Web Crypto API — `crypto.subtle.encrypt`. On write, I
generate a random 12-byte IV, encrypt the plaintext, and store `<iv_hex>:<ciphertext_hex>`
as one string in the DB column. GCM gives me authenticated encryption — tampering
throws on decrypt rather than silently returning garbage. On read in the digest runner
I call `decryptIfPresent()` which splits on `:`, reconstructs IV and ciphertext, and
decrypts. Values without `:` are treated as legacy plaintext — this let me ship
encryption as a safe migration. I also wrote a one-shot migration script that skips
already-encrypted values by detecting the `:` separator."

### "How did you handle the Suspense/useSearchParams build error?"

"Next.js 14 App Router requires any component calling `useSearchParams()` to be
inside a `<Suspense>` boundary — without it the build fails with a static generation
error. The pattern I used is: extract the hook into an inner component, wrap only
that in Suspense, not the whole page. This keeps the fallback scoped and the outer
shell renders immediately. I caught this in a systematic audit across all auth pages
— login, signup, accept-invite, reset-password — and the dashboard upgrade toast."

### "How does your password reset prevent user enumeration?"

"The endpoint always returns HTTP 200 with an identical message whether or not the
email exists. Rate limiting is 3 requests per hour per email address. Tokens are
single-use (marked `usedAt` on consumption), expire in 1 hour, and any prior unused
tokens for the same user are invalidated before issuing a new one — so spamming the
endpoint creates one valid token, not many."

### Updated numbers to know

| Metric | Value |
|--------|-------|
| AES key length | 256-bit (ENCRYPTION_KEY = 64-char hex = 32 bytes) |
| AES IV length | 12 bytes (GCM recommendation) |
| Password reset TTL | 1 hour |
| Reset token format | cuid (URL-safe, collision-resistant) |
| Rate limit — registration | 10 / 15 min / IP |
| Rate limit — AI chat | 30 / hour / user |
| Rate limit — source refresh | 1 / 10 min / source (DB-enforced via lastFetched) |
| Token cleanup cadence | Daily via source-health cron |

---

*Built by Heramb Chaudhari — portfolio SaaS project demonstrating full-stack engineering*
