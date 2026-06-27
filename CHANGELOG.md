# Changelog

All notable changes to AI Digest are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-06-26

### Added — Phase 9 (Build correctness & hardening)
- Suspense boundaries on login, signup, upgraded-toast (Next.js 14 build requirement for `useSearchParams`)
- `PasswordResetToken` cleanup in source-health cron (prevents unbounded DB growth)
- `scripts/test-reset-password.ts` — end-to-end token flow validation
- Structured logger replacing all `console.log` in stripe webhook handler

### Fixed — Phase 9
- `next.config.ts` — removed runtime `process.env` from build-time `allowedOrigins`
- `dashboard/page.tsx` — removed redundant outer Suspense (UpgradedToast now self-contained)

### Added — Phase 8 (Gap fill)
- AES-256-GCM encryption (`lib/crypto.ts`) — Web Crypto API, random IV per write, GCM auth tag
- Encryption wired into user settings PATCH (write) and digest runner (read)
- `lib/team-digest.ts` now decrypts team owner's BYOK key before Gemini call
- Password reset flow — forgot-password page, reset-password page, two API routes, `PasswordResetToken` schema model
- "Forgot password?" link on login page
- `/api/team/leave` route — non-owners can leave; owner+last-member deletes team
- "Leave team" button in team page header
- `SourceHealthBadge` component shown per-source in Settings → Sources
- Per-source refresh button (calls `/api/sources/[id]/refresh`, shows new article count)
- Source health data joined into sources API response
- `lib/rate-limit.ts` — sliding-window in-memory rate limiter
- Rate limiting on register endpoint (10/15min/IP) and AI chat (30/hr/user)
- `lib/errors.ts` — typed AppError hierarchy with `errorResponse()` helper
- `hooks/use-keyboard-shortcut.ts` — j/k article navigation, o open in tab
- `scripts/migrate-encrypt-keys.ts` — safe one-shot BYOK key encryption migration
- `scripts/health-check.ts` — 7-endpoint post-deploy verification script

### Added — Phase 7 (Production hardening)
- `lib/crypto.ts` — AES-256-GCM encryption for BYOK Gemini API keys (stub → full implementation)
- Security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options, Permissions-Policy)
- `app/api/sources/[id]/refresh/route.ts` — per-source manual refresh with 10-min cooldown
- Error boundaries: `app/error.tsx`, `app/(app)/error.tsx`
- Loading skeletons: `app/loading.tsx`, `app/(app)/dashboard/loading.tsx`
- 404 page: `app/not-found.tsx`
- GDPR data export: `app/api/user/export/route.ts`
- Account deletion: `app/api/user/delete/route.ts` (password-confirmed, cancels Stripe subscription)
- PWA manifest: `public/manifest.json`
- `robots.txt` and `sitemap.xml` dynamic routes
- GitHub Actions CI: typecheck + lint on every PR, fetcher smoke on main push
- `.github/PULL_REQUEST_TEMPLATE.md`
- `CHANGELOG.md` (this file)
- `.eslintrc.json`

### Added — Phases 0–6
See git history for the initial 127 files across the six foundational phases.

### Added

**Core platform**
- Multi-source feed ingestion: RSS/Atom, YouTube channels, Reddit subreddits, webpage scraping
- Google Gemini 2.0 Flash AI summarisation — 2–3 sentence summaries, category labels, importance scores 1–5
- Per-user deduplication via `SeenArticle(userId, articleId) @@unique` constraint
- Global article deduplication via `Article.url @unique` — one Gemini call per article globally
- BYOK (Bring Your Own Key) — users supply their own Gemini API key, stored AES-256 encrypted
- OPML import with drag-and-drop UI — compatible with Feedly, NewsBlur, Reeder, Inoreader

**Dashboard**
- Sidebar + reader layout (email-client style) with infinite scroll
- Category filter bar: Technical, Business, Trends, Tools, News, General
- Per-source sidebar filter
- AI chat panel — ask questions about your digest (Pro)
- Article bookmarks (Pro)
- Summary regeneration on demand (Pro)
- Live refresh with polling status indicator

**Auth & accounts**
- Email + password authentication via Auth.js v5
- JWT sessions — plan stored in token, no DB query per request
- bcrypt password hashing (cost factor 12)
- Password-confirmed account deletion
- GDPR data export endpoint

**Background jobs**
- Vercel Cron: `daily-digest` at 06:00 UTC — fetch, summarise, email
- Vercel Cron: `source-health` at 08:00 UTC — re-test deactivated sources
- `DigestRun` + `DigestRunLog` per-source structured logging
- `SourceHealth` — auto-deactivates sources after 5 consecutive failures
- Auto-recovery: reactivates sources when they respond again
- Email alerts: source deactivated, source recovered

**Teams**
- Team workspace creation (TEAM plan required)
- Invite-token system — 7-day TTL, single-use, email delivery
- Accept invite page — handles auth state (logged-in / not)
- Role-based access: OWNER, ADMIN, MEMBER
- Shared source library with team-scoped CRUD
- Team digest fan-out: `seenArticle.createMany()` — O(sources) not O(members × sources)

**SaaS & payments**
- Freemium pricing: Free → Pro ($12/mo) → Team ($29/mo)
- Stripe Checkout Sessions for plan upgrades
- Stripe Billing Portal for self-service subscription management
- Webhook handling: `checkout.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`
- Idempotent webhook processing — safe to replay any event
- Referral system: invite link, reward crediting via Stripe `trial_end` extension

**Email (Resend)**
- Daily digest HTML email with importance dots and TL;DR paragraph
- Source deactivation alert with error details and fix link
- Source recovery notification
- Team invite email

**Observability**
- Admin dashboard at `/admin` (ADMIN_EMAIL only): DAU, plan breakdown, source health, recent runs, error log
- Email preview at `/api/admin/preview-email?type=digest`
- Structured logger (`lib/logger.ts`) — JSON in production, coloured console in dev

**Infrastructure**
- Security headers via `next.config.ts` (CSP, HSTS, X-Frame-Options, etc.)
- `robots.txt` and `sitemap.xml` dynamic routes
- PWA web manifest
- GitHub Actions CI: typecheck + lint on every PR, fetcher smoke tests on main push

**Developer experience**
- `npm run test:fetchers` — live-fetch RSS/Reddit/Scrape URLs
- `npm run test:gemini` — verify API key + output schema
- `npm run test:digest` — full end-to-end run for one user
- `npm run test:cron:dry` — fetch all sources, skip AI + DB (fast)
- `npm run test:cron` — full cron simulation against DB
- `npm run test:email` — send a real test digest email
- `npm run test:team` — validate invite token flow

**Documentation**
- `docs/INTERVIEW_PREP.md` — STAR stories, Q&A, two-minute summary, system design walkthrough
- `docs/ARCHITECTURE.md` — deep design decision rationale with trade-off analysis
- `docs/DEPLOYMENT.md` — 11-step Vercel + Neon production deployment guide

---

## [0.5.0] — Phase 4 — Teams & OPML

Internal development milestone. See phase notes.

## [0.4.0] — Phase 3 — Observability

Internal development milestone. See phase notes.

## [0.3.0] — Phase 2 — Dashboard UI

Internal development milestone. See phase notes.

## [0.2.0] — Phase 1 — Feed Engine

Internal development milestone. See phase notes.

## [0.1.0] — Phase 0 — Bootstrap

Internal development milestone. See phase notes.
