// app/api/referral/apply/route.ts
// POST { referralCode } — validates a referral code and returns the referrer's name
// so the signup page can show a personalised "You were referred by X" message.
// The actual credit is applied in the registration route and Stripe webhook.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { referralCode } = await req.json();

  if (!referralCode || typeof referralCode !== "string") {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const referrer = await db.user.findFirst({
    where:  { referralCode: referralCode.trim() },
    select: { name: true, email: true },
  });

  if (!referrer) {
    return NextResponse.json({ valid: false, error: "Referral code not found." }, { status: 404 });
  }

  return NextResponse.json({
    valid:       true,
    referrerName: referrer.name ?? referrer.email.split("@")[0],
  });
}
