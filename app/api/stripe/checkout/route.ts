// app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout Session for plan upgrades.
// After payment, Stripe fires checkout.session.completed webhook
// which updates user.plan in the database.

import { NextRequest, NextResponse } from "next/server";
import { auth }   from "@/lib/auth";
import { db }     from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { plan } = body;
  if (plan !== "PRO" && plan !== "TEAM") {
    return NextResponse.json({ error: "Invalid plan. Must be PRO or TEAM." }, { status: 400 });
  }

  const priceId = plan === "TEAM"
    ? process.env.STRIPE_TEAM_PRICE_ID
    : process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price ID for ${plan} is not configured.` },
      { status: 503 }
    );
  }

  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { email: true, name: true, stripeCustomerId: true, plan: true },
  });

  // Don't let someone "upgrade" to the same or lower plan
  if (user.plan === plan || (user.plan === "TEAM" && plan === "PRO")) {
    return NextResponse.json(
      { error: `You're already on the ${user.plan} plan.` },
      { status: 400 }
    );
  }

  // ── Get or create Stripe Customer ──────────────────────────────────────────
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    user.email,
      name:     user.name ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: userId },
      data:  { stripeCustomerId: customerId },
    });
  }

  // ── Create Checkout Session ────────────────────────────────────────────────
  const checkoutSession = await stripe.checkout.sessions.create({
    mode:       "subscription",
    customer:    customerId,
    line_items: [{ price: priceId, quantity: 1 }],

    // Metadata passed through to the subscription — used in webhook handler
    subscription_data: {
      metadata: { userId, plan },
    },

    success_url: `${process.env.NEXTAUTH_URL}/dashboard?upgraded=true`,
    cancel_url:  `${process.env.NEXTAUTH_URL}/settings/billing?cancelled=true`,

    // Let Stripe handle promotion codes (discount coupons)
    allow_promotion_codes: true,

    // Collect billing address for tax purposes
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: checkoutSession.url });
}
