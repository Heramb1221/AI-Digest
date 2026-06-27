// app/api/auth/forgot-password/route.ts
// POST { email } — generates a password reset token and sends an email.
//
// Security notes:
//   - Always returns 200 regardless of whether the email exists (prevents user enumeration)
//   - Token expires in 1 hour
//   - Old tokens for the same user are invalidated before creating a new one
//   - Rate limited to 3 requests per hour per email address

import { NextRequest, NextResponse } from "next/server";
import { db }          from "@/lib/db";
import { resend }      from "@/lib/email";
import { createRateLimiter } from "@/lib/rate-limit";

const resetLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60_000 });
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  // Rate limit per email address
  const limited = resetLimiter.check(`forgot:${normalized}`);
  if (!limited.success) {
    // Still return 200 to prevent timing attacks
    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }

  const user = await db.user.findUnique({
    where:  { email: normalized },
    select: { id: true, name: true },
  });

  // Always return success — never reveal whether the email exists
  if (!user) {
    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }

  // Invalidate any existing tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data:  { usedAt: new Date() }, // mark as used to invalidate
  });

  // Create new token
  const token     = await db.passwordResetToken.create({
    data: {
      userId:    user.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token.token}`;

  await resend.emails.send({
    from:    process.env.EMAIL_FROM ?? "digest@resend.dev",
    to:      normalized,
    subject: "Reset your AI Digest password",
    html: `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#fafaf9;">
  <p style="font-size:12px;color:#9ca3af;margin:0 0 24px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">AI Digest</p>
  <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
  <p style="font-size:14px;color:#6b6b6b;line-height:1.6;margin:0 0 24px;">
    Hi ${user.name ?? "there"}, we received a request to reset your password.
    Click the button below to choose a new one.
  </p>
  <a href="${resetUrl}"
     style="display:inline-block;background:#1a1a1a;color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
    Reset password
  </a>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px;line-height:1.6;">
    This link expires in 1 hour. If you didn't request a reset, you can ignore this email.
  </p>
  <p style="font-size:11px;color:#a3a3a3;margin-top:16px;word-break:break-all;">
    Or copy this link: ${resetUrl}
  </p>
</body></html>`,
  });

  return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
}
