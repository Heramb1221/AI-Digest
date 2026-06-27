// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db }           from "@/lib/db";
import bcrypt           from "bcryptjs";
import { authLimiter }  from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit by IP: 10 registrations per 15 minutes
  const ip     = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = authLimiter.check(`register:${ip}`);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      {
        status:  429,
        headers: { "Retry-After": String(Math.ceil((limited.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  try {
    const body = await req.json();
    const { name, email, password, referralCode } = body;

    // ─── Validation ───────────────────────────────────────────────────────────
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ─── Uniqueness check ─────────────────────────────────────────────────────
    const existing = await db.user.findUnique({
      where:  { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // ─── Find referrer ────────────────────────────────────────────────────────
    let referrerId: string | null = null;
    if (referralCode && typeof referralCode === "string") {
      const referrer = await db.user.findFirst({
        where:  { referralCode: referralCode.trim() },
        select: { id: true },
      });
      referrerId = referrer?.id ?? null;
    }

    // ─── Hash password (bcrypt, cost factor 12) ───────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ─── Create user ──────────────────────────────────────────────────────────
    const user = await db.user.create({
      data: {
        name:         name?.trim() || null,
        email:        normalizedEmail,
        passwordHash,
        referredBy:   referrerId,
      },
      select: {
        id:    true,
        email: true,
        name:  true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
