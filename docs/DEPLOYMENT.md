# AI Digest — Deployment Guide

Complete step-by-step guide to deploy from a fresh clone to production on Vercel.
Takes about 45 minutes the first time.

---

## Prerequisites

- Node.js 18+
- A Vercel account (free hobby plan is fine)
- A Neon account (free)
- A Google Cloud account (for Gemini + YouTube API keys)
- A Resend account (free: 100 emails/day)
- A Stripe account (test mode to start)

---

## Step 1 — Neon database

1. Go to https://console.neon.tech → **New project**
2. Name it `ai-digest`, select the region closest to your users
3. From **Connection Details**, copy two strings:
   - **Pooled connection** (for `DATABASE_URL`) — has `?pgbouncer=true` in it
   - **Direct connection** (for `DIRECT_URL`) — no pgbouncer
4. You'll paste these into Vercel environment variables later

---

## Step 2 — Google APIs

### Gemini API key
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key** → copy it
3. Free tier: 1,500 requests/day — enough for ~30 daily users

### YouTube Data API v3
1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Go to **APIs & Services** → **Enable APIs** → search "YouTube Data API v3" → Enable
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **API key**
5. Copy the key. Restrict it to YouTube Data API v3 only.

---

## Step 3 — Resend

1. Go to https://resend.com → sign up
2. **Domains** → Add your domain, or use `resend.dev` for testing (no DNS setup)
3. **API Keys** → Create key → copy it
4. Set `EMAIL_FROM` to `digest@yourdomain.com` or `digest@resend.dev` for testing

---

## Step 4 — Stripe

1. Go to https://dashboard.stripe.com → use **Test mode** initially
2. **Products** → **Add product**:
   - **Pro plan**: $12/month recurring → copy the Price ID (`price_...`)
   - **Team plan**: $29/month recurring → copy the Price ID
3. **Developers** → **API keys** → copy the **Publishable key** and **Secret key**
4. Webhooks are set up after Vercel deployment (Step 7)

---

## Step 5 — Deploy to Vercel

### Option A: Vercel CLI (recommended)

```bash
npm install -g vercel
cd ai-digest
vercel
```

Follow the prompts:
- Link to existing project: No
- Project name: `ai-digest`
- Framework: Next.js (auto-detected)
- Override build settings: No

### Option B: GitHub import

1. Push your code to GitHub
2. Go to https://vercel.com/new → Import Git repository
3. Select your `ai-digest` repo → Deploy

---

## Step 6 — Environment variables

In the Vercel dashboard → your project → **Settings** → **Environment Variables**.

Add each of these (all environments: Production, Preview, Development):

```
DATABASE_URL          = <Neon pooled connection string>
DIRECT_URL            = <Neon direct connection string>
NEXTAUTH_URL          = https://your-project.vercel.app
NEXTAUTH_SECRET       = <run: openssl rand -base64 32>
GEMINI_API_KEY        = AIza...
RESEND_API_KEY        = re_...
EMAIL_FROM            = digest@yourdomain.com
STRIPE_SECRET_KEY     = sk_test_...
STRIPE_WEBHOOK_SECRET = whsec_... (set after Step 7)
STRIPE_PRO_PRICE_ID   = price_...
STRIPE_TEAM_PRICE_ID  = price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_...
YOUTUBE_API_KEY       = AIza...
CRON_SECRET           = <run: openssl rand -hex 32>
ENCRYPTION_KEY        = <run: openssl rand -hex 32>
ADMIN_EMAIL           = your@email.com
NEXT_PUBLIC_ADMIN_EMAIL = your@email.com
```

After adding all variables: **Deployments** → **Redeploy** (or push a new commit).

---

## Step 7 — Run database migrations

Once deployed and env vars are set:

```bash
# From your local machine with .env.local filled in:
npm run db:push

# Verify the schema was applied:
npm run db:studio
# Open http://localhost:5555 — you should see all tables
```

---

## Step 8 — Configure Stripe webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-project.vercel.app/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Click **Add endpoint** → copy the **Signing secret** (`whsec_...`)
5. Go back to Vercel → add `STRIPE_WEBHOOK_SECRET = whsec_...`
6. Redeploy

---

## Step 9 — Verify the cron jobs

Vercel automatically reads `vercel.json` and registers:
- `/api/cron/daily-digest` — `0 6 * * *` (06:00 UTC daily)
- `/api/cron/source-health` — `0 8 * * *` (08:00 UTC daily)

To verify:
1. Vercel dashboard → your project → **Cron Jobs** tab
2. You should see both jobs listed

To manually trigger a cron for testing:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-project.vercel.app/api/cron/daily-digest
```

---

## Step 10 — Smoke test

1. Visit `https://your-project.vercel.app` → landing page should load
2. Create an account → `/signup`
3. Add a source (e.g. `https://news.ycombinator.com/rss`)
4. Trigger a manual refresh from the dashboard
5. Wait ~30 seconds → articles should appear
6. Visit `/api/health` → should return `{"status":"ok","db":"connected"}`
7. Visit `/api/admin` (with your ADMIN_EMAIL account) → stats dashboard

---

## Step 11 — Custom domain (optional)

1. Vercel dashboard → your project → **Settings** → **Domains**
2. Add your domain → follow the DNS configuration instructions
3. Update `NEXTAUTH_URL` to your custom domain
4. Update the Stripe webhook URL to your custom domain
5. Redeploy

---

## Troubleshooting

### "Prisma: Cannot connect to database"
- Check `DATABASE_URL` has `?sslmode=require` at the end for Neon
- Make sure `DIRECT_URL` is the non-pooled string for migrations

### "Auth: NEXTAUTH_URL mismatch"
- Must exactly match your deployment URL including `https://`
- No trailing slash

### "Stripe webhook: signature invalid"
- `STRIPE_WEBHOOK_SECRET` must be the endpoint signing secret, not the API key
- The webhook handler uses `req.text()` not `req.json()` — do not add `bodyParser`

### "Gemini: 429 Too Many Requests"
- You've hit the 1,500 req/day free tier limit
- Either reduce sources, add BYOK for users, or upgrade to Gemini paid tier

### "Cron not running"
- Vercel Hobby plan: crons only run on your **production** deployment
- Preview deployments do not execute crons

---

## Going live checklist

- [ ] Switch Stripe from test mode to live mode (new API keys)
- [ ] Verify Stripe webhook in live mode
- [ ] Set `EMAIL_FROM` to a verified custom domain email
- [ ] Test the full payment flow end-to-end
- [ ] Set up Vercel's log drain (optional: forward to Axiom/Datadog)
- [ ] Add error monitoring (optional: Sentry)
- [ ] Set up uptime monitoring (optional: BetterStack, UptimeRobot)

---

*Estimated first-deployment time: 45 minutes*
*Estimated monthly infrastructure cost at 0 paying users: $0*
*First cost: Resend at 100+ daily active users (~$20/month)*
