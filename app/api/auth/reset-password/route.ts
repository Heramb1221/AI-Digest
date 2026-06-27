// app/api/auth/reset-password/route.ts
// POST { token, password } — validates the reset token and updates the password.
//
// Security notes:
//   - Token is single-use (marked usedAt on success)
//   - Token expires in 1 hour
//   - Old sessions are NOT invalidated (JWT expiry handles this within 24h)
//   - Password is bcrypt-hashed with cost factor 12

import { NextRequest, NextResponse } from "next/server";
import { db }     from "@/lib/db";
import bcrypt     from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // Load the token
  const resetToken = await db.passwordResetToken.findUnique({
    where:  { token },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }
  if (resetToken.usedAt) {
    return NextResponse.json(
      { error: "This reset link has already been used." },
      { status: 400 }
    );
  }
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link has expired. Request a new one." },
      { status: 400 }
    );
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12);

  // Update password + mark token as used (atomic)
  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data:  { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data:  { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Password updated successfully." });
}
