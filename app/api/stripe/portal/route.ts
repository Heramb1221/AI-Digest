// app/api/stripe/portal/route.ts
// Creates a Stripe Billing Portal session — lets users manage their
// subscription, update payment method, download invoices, or cancel.
// Zero custom UI required on our side.

import { NextResponse } from "next/server";
import { auth }   from "@/lib/auth";
import { db }     from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const session = await auth();
  const userId  = session!.user.id;

  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Upgrade to a paid plan first." },
      { status: 400 }
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   user.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
