# AI Digest — Architecture Notes

Deep-dive into every significant design decision. Written for two audiences:
engineers reviewing the portfolio, and Heramb preparing for interviews.

---

## Data model rationale

### Why a separate SeenArticle table instead of a column on Article?

A `Article.seenByUserId` column would only support one user seeing an article.
A boolean `Article.seen` column is global — once one user reads it, everyone's
filtered out. The `SeenArticle` join table scales to unlimited users with a
O(1) lookup via the `@@unique([userId, articleId])` index.

The table also doubles as an audit log: `seenAt` tells you exactly when each
user first encountered each article, useful for debugging digest timing issues.

### Why store `content` on Article (up to 10KB)?

Two reasons: (1) Gemini needs it for summarisation — storing it means we only
fetch the content once, not once per regeneration request. (2) It enables future
features like full-text search without re-fetching the original URL.

The 10KB cap is a deliberate trade-off. Most article content fits in 2-4KB. The
rare 50KB article is truncated before both storage and the Gemini prompt.

### Why does Source have both `userId` and `teamId`?

A source belongs to either a personal user OR a team, never both. The nullable
foreign key design (both nullable, one set) is cleaner than a polymorphic
`ownerType` + `ownerId` pattern because Prisma can enforce the relation types.

The `@@index([userId])` and `@@index([teamId])` ensure fast lookups in both
directions without a compound index.

### SourceHealth as a separate table

Keeping health metadata off the Source table is a deliberate normalization
choice. The Source table is read on every digest run and every settings page
load. SourceHealth is only read by the health-check cron and the settings
UI. Keeping them separate avoids loading health data on the hot path.

---

## Authentication design

### Why credentials + JWT instead of OAuth?

For a portfolio project that needs to demonstrate auth engineering, credentials
with bcrypt is more illustrative than OAuth. It shows: password hashing, JWT
structure, session expiry, and middleware-level verification.

OAuth would be simpler to ship but would hide the auth logic behind a provider.

### Why Auth.js v5 instead of Clerk?

Same reasoning. Clerk is excellent for production but abstracts all auth
implementation. Auth.js v5 with the Prisma adapter requires understanding:
- How the PrismaAdapter maps to the database schema
- How JWT callbacks extend the token with custom claims
- How the session callback exposes those claims to components

These are questions that come up in senior interviews.

### Plan in JWT payload

Storing `user.plan` in the JWT means feature gates run without a DB query.
The downside: if a user upgrades, the old plan stays in their JWT until the
next token refresh (up to 24 hours). This is acceptable because:
1. Stripe checkout redirects back to the app, triggering a page load + session refresh
2. The 24-hour window is a known trade-off documented in the codebase
3. At scale, eliminating DB queries per request is the right call

For stricter requirements, the JWT could include a `planVersion` incremented on
upgrade, with a middleware check against a Redis cache.

---

## Feed fetching design

### Why four separate fetcher modules?

Single responsibility. Each fetcher handles one source type's error surface and
API quirks. The `fetchSource()` dispatcher in `lib/fetchers/index.ts` is the
only dependency the digest runner has — it doesn't need to know which fetcher
is used.

This makes it trivial to add new source types (podcast RSS, GitHub releases,
newsletters via IMAP) without touching the runner.

### YouTube API quota management

YouTube Data API v3 charges 100 units per `search.list` call. The free quota
is 10,000 units/day. With one channel per user refreshed daily, that's 100
safe fetches before hitting the limit. At 100 daily active users with YouTube
sources, I'd need to apply for a quota increase or cache channel IDs.

The current implementation caches nothing — a v2 optimization is to store the
resolved `channelId` on the Source row after the first fetch, avoiding the
`channels.list` call (1 unit) on subsequent runs.

### Scrape fallback quality

The `fetchScrape()` function is intentionally a heuristic — it works well on
simple CMS sites (WordPress, Ghost, Substack) but fails on JavaScript-heavy
SPAs (Vercel blog, Next.js docs). For those, the fallback returns the page's
OG metadata as a single article.

Users are informed in the UI: "Webpage scraping works best on blog-style sites.
For JavaScript-heavy sites, look for an RSS feed instead."

---

## Gemini integration

### JSON mode vs prompt engineering

Gemini 2.0 Flash supports `responseMimeType: "application/json"` which constrains
the output to valid JSON. Combined with a strict system prompt and a well-defined
JSON schema, this eliminates the parsing fallbacks in ~98% of cases.

The `parseAnalysis()` fallback function handles the remaining 2%: strips markdown
fences, extracts the first `{...}` block, and validates the category against
an allowlist.

### Model caching

`GoogleGenerativeAI` instances are created per API key and cached in a `Map`.
Without caching, each article would instantiate a new client — at 50 articles
per run, that's 50 unnecessary object creations and potential connection pool
exhaustion.

The cache is capped at 50 entries and cleared when full to prevent memory leaks
in long-running Vercel functions.

### Why temperature 0.3?

For summarisation, low temperature gives consistent, factual output. High temperature
would produce more creative but less predictable summaries. The goal is a tool,
not a creative writing exercise.

---

## Stripe integration

### Why `subscription_data.metadata` instead of `client_reference_id`?

Both work, but `subscription_data.metadata` is attached to the Subscription
object in Stripe, not just the Checkout Session. This means the metadata is
available on every subsequent webhook event (`subscription.updated`,
`subscription.deleted`) without having to look up the original session.

### Customer Portal vs custom billing UI

The Stripe Customer Portal handles: update payment method, view invoices, cancel
subscription, change plan. Building this UI in-house would take 2-3 weeks and
require PCI compliance considerations. The Portal handles it in one API call.

The trade-off is a loss of UI control (users briefly see Stripe's branding), which
is acceptable for a SaaS at this scale.

### Referral crediting via `trial_end`

Extending a subscription by setting `trial_end` to `current_period_end + 30 days`
is cleaner than creating a coupon because: (1) it extends the current period
without a proration calculation; (2) it works regardless of billing interval
(monthly vs annual); (3) the customer sees "Free until [date]" in the portal.

---

## Background job design

### Why `Promise.allSettled` over `Promise.all`?

`Promise.all` fails fast on the first rejection. If one user's digest fails,
`Promise.all` would abort all remaining users in the batch. `Promise.allSettled`
collects all outcomes — failures are logged but don't stop the batch.

This is documented explicitly in the cron handler:
```typescript
const settled = await Promise.allSettled(
  batch.map((u) => runDigestForUser(u.id, u.geminiApiKey))
);
```

### DigestRunLog retention policy

Keeping all logs forever would exhaust Neon's free 10GB tier. The `source-health`
cron purges `DigestRunLog` entries older than 30 days and `DigestRun` records
older than 90 days. Users can see their last 20 runs in Settings — enough for
debugging without unbounded growth.

---

## Security considerations

### BYOK key encryption

User-supplied Gemini API keys are stored in the database but must not be readable
if the DB is compromised. They're encrypted with AES-256 before storage using
the `ENCRYPTION_KEY` environment variable. The key itself never leaves the server
and is never returned in API responses (the settings API returns `hasGeminiKey:
boolean`, not the key itself).

*Note: the encryption implementation is planned for v2. Currently the key is
stored as plaintext — the infrastructure is in place but the actual
CryptoSubtle implementation is a one-day addition.*

### Cron endpoint authentication

The cron endpoint checks the `Authorization: Bearer <CRON_SECRET>` header.
Vercel automatically sets this header on scheduled invocations. This prevents
anyone from triggering the cron via a public HTTP request without the secret.

### Rate limiting manual refresh

Manual refresh is rate-limited to once per hour (or 30 minutes for Team) per user.
This prevents users from triggering unbounded Gemini API calls. The limit is
enforced server-side in `/api/digest/run` by checking `DigestRun.startedAt`
before accepting a new request.

---

## Performance considerations

### Connection pooling with Neon

Neon uses PgBouncer for connection pooling. The `DATABASE_URL` uses the pooled
endpoint; `DIRECT_URL` uses the direct endpoint (needed for Prisma migrations
which can't run through PgBouncer). Without pooling, serverless functions would
exhaust Postgres's connection limit instantly.

### RSC vs client components

The dashboard page is a React Server Component that fetches initial data
(sources list, session) before sending HTML to the client. The `DashboardClient`
handles all interactivity. This pattern gives:
- Fast initial load (no client-side waterfall)
- Reduced JavaScript bundle (data-fetching stays on server)
- Type-safe data passing (no API call for the initial render)

### Article API pagination

The articles API paginates at 30 items and supports infinite scroll via
`IntersectionObserver` in the client. Loading all articles at once would be
slow and waste bandwidth for users who only read the top 5.

---

## Known limitations and v2 improvements

| Limitation | v2 Solution |
|-----------|-------------|
| Vercel 60s timeout | Upstash QStash per-user job dispatch |
| No Redis caching | Upstash Redis for dedup lookups |
| BYOK key stored plaintext | AES-256 encryption with Web Crypto API |
| No full-text search | Postgres full-text or Typesense |
| YouTube channel ID not cached | Store resolved channelId on Source |
| No podcast transcript support | Whisper API for transcription |
| Manual cron trigger hits rate limit | Per-source granular refresh |
| Team invite link is one-use | Multi-use invite links with expiry |

---

*This document is a living reference — update it as the codebase evolves.*
