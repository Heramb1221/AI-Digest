// app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth }               from "@/lib/auth";
import { db }                 from "@/lib/db";
import { encryptIfPresent, decryptIfPresent } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: {
      id:                 true,
      name:               true,
      email:              true,
      plan:               true,
      digestEmailEnabled: true,
      geminiApiKey:       true,
      referralCode:       true,
    },
  });

  return NextResponse.json({
    id:                 user.id,
    name:               user.name,
    email:              user.email,
    plan:               user.plan,
    digestEmailEnabled: user.digestEmailEnabled,
    // Never return the actual key — just indicate presence
    hasGeminiKey:       !!user.geminiApiKey,
    referralCode:       user.referralCode,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;
  const body    = await req.json();

  const update: Record<string, unknown> = {};

  if ("name" in body) {
    update.name = body.name?.trim() || null;
  }
  if ("digestEmailEnabled" in body) {
    update.digestEmailEnabled = Boolean(body.digestEmailEnabled);
  }
  if ("geminiApiKey" in body) {
    // Null means remove; non-null means encrypt before storing
    update.geminiApiKey = body.geminiApiKey
      ? await encryptIfPresent(body.geminiApiKey)
      : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const user = await db.user.update({
    where:  { id: userId },
    data:   update,
    select: { id: true, name: true, email: true, plan: true },
  });

  return NextResponse.json(user);
}
