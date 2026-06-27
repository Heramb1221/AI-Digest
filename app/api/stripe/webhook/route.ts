// app/api/stripe/webhook/route.ts
// Receives and processes Stripe webhook events.
//
// Security: every request is verified with stripe.webhooks.constructEvent()
// using the STRIPE_WEBHOOK_SECRET. Requests with invalid signatures are
// rejected immediately with 400.
//
// Idempotency: we check database state before writing — processing the same
// event twice is safe.
//
// Events handled:
//   checkout.session.completed        → activate plan + credit referrer
//   customer.subscription.updated     → sync plan changes (upgrades/downgrades)
//   customer.subscription.deleted     → revert user to FREE
//   invoice.payment_failed            → (logged; email handled by Stripe)

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db }     from "@/lib/db";
import { log }    from "@/lib/logger";
import type Stripe from "stripe";

// IMPORTANT: This route must receive the raw request body for signature verification.
// Next.js App Router provides it via req.text() — do NOT use req.json() here.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("stripe.webhook.signature_failed", { error: msg });
    return NextResponse.json({ error: `Webhook signature invalid: ${msg}` }, { status: 400 });
  }

  // ── Route by event type ─────────────────────────────────────────────────────
  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[webhook] Payment failed for customer ${invoice.customer}`);
        // Stripe automatically retries and emails the customer.
        // We don't downgrade immediately — let Stripe's dunning handle it.
        break;
      }

      default:
        // Unhandled event type — return 200 so Stripe doesn't retry
        break;
    }
  } catch (err) {
    log.error("stripe.webhook.handler_failed", { event: event.type, error: String(err) });
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.subscription_data?.metadata?.userId
               ?? (session.metadata as any)?.userId;
  const plan   = session.subscription_data?.metadata?.plan
               ?? (session.metadata as any)?.plan
               ?? "PRO";

  if (!userId) {
    log.error("stripe.checkout.missing_userId", { sessionId: session.id });
    return;
  }

  await db.user.update({
    where: { id: userId },
    data:  { plan: plan as any },
  });

  log.info("stripe.checkout.upgraded", { userId, plan });
  await creditReferrer(userId);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  if (sub.status !== "active" && sub.status !== "trialing") return;

  const customerId = sub.customer as string;
  const plan       = (sub.metadata?.plan ?? "PRO") as "PRO" | "TEAM";

  await db.user.updateMany({
    where: { stripeCustomerId: customerId },
    data:  { plan },
  });

  log.info("stripe.subscription.updated", { customerId, plan });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;

  await db.user.updateMany({
    where: { stripeCustomerId: customerId },
    data:  { plan: "FREE" },
  });

  log.info("stripe.subscription.cancelled", { customerId });
}

// ─── Referral credit ─────────────────────────────────────────────────────────

async function creditReferrer(newUserId: string) {
  const newUser = await db.user.findUnique({
    where:  { id: newUserId },
    select: { referredBy: true },
  });

  if (!newUser?.referredBy) return;

  // Prevent double-crediting (refereeId is unique in ReferralReward)
  const alreadyCredited = await db.referralReward.findFirst({
    where: { refereeId: newUserId },
  });
  if (alreadyCredited) return;

  // Write the reward record
  await db.referralReward.create({
    data: {
      referrerId: newUser.referredBy,
      refereeId:  newUserId,
      months:     1,
    },
  });

  // Extend the referrer's Stripe subscription by 30 days
  const referrer = await db.user.findUnique({
    where:  { id: newUser.referredBy },
    select: { stripeCustomerId: true },
  });

  if (!referrer?.stripeCustomerId) return;

  const subs = await stripe.subscriptions.list({
    customer: referrer.stripeCustomerId,
    status:   "active",
    limit:    1,
  });

  if (subs.data[0]) {
    const existingSub = subs.data[0];
    const newPeriodEnd = existingSub.current_period_end + 30 * 24 * 60 * 60; // +30 days

    await stripe.subscriptions.update(existingSub.id, {
      trial_end:          newPeriodEnd,
      proration_behavior: "none",
    });

    log.info("stripe.referral.credited", { referrerId: newUser.referredBy, refereeId: newUserId });
  }
}
