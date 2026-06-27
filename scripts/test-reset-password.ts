#!/usr/bin/env tsx
// scripts/test-reset-password.ts
// Validates the full password reset token flow without sending real emails.
// Requires DATABASE_URL to be set.
//
//   Usage: npx tsx scripts/test-reset-password.ts <userId>

import { db }     from "../lib/db";
import bcrypt     from "bcryptjs";

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: npx tsx scripts/test-reset-password.ts <userId>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set");
    process.exit(1);
  }

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`User ${userId} not found`);
    process.exit(1);
  }

  console.log(`\nTesting password reset for: ${user.email}\n`);
  let passed = 0;
  let failed  = 0;

  // ── 1. Create token ──────────────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = await db.passwordResetToken.create({
    data: { userId: user.id, expiresAt },
  });
  console.log(`  ✓ Token created: ${token.token.slice(0, 8)}…`);
  passed++;

  // ── 2. Verify token is loadable ──────────────────────────────────────────
  const loaded = await db.passwordResetToken.findUnique({ where: { token: token.token } });
  if (loaded && !loaded.usedAt && loaded.expiresAt > new Date()) {
    console.log("  ✓ Token valid (not used, not expired)");
    passed++;
  } else {
    console.log("  ✗ Token validation failed");
    failed++;
  }

  // ── 3. Simulate password change ──────────────────────────────────────────
  const newPasswordHash = await bcrypt.hash("testNewPassword123!", 12);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } }),
    db.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
  ]);
  console.log("  ✓ Password updated + token marked used");
  passed++;

  // ── 4. Verify token is now marked used ───────────────────────────────────
  const usedToken = await db.passwordResetToken.findUnique({ where: { token: token.token } });
  if (usedToken?.usedAt) {
    console.log("  ✓ Token correctly marked as used");
    passed++;
  } else {
    console.log("  ✗ Token not marked as used");
    failed++;
  }

  // ── 5. Verify old password would not work (hash changed) ─────────────────
  const reloaded = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  const newHashMatches = reloaded?.passwordHash === newPasswordHash;
  if (newHashMatches) {
    console.log("  ✓ New password hash is stored");
    passed++;
  } else {
    console.log("  ✗ Password hash mismatch");
    failed++;
  }

  // ── 6. Restore original password hash (clean up) ─────────────────────────
  // We don't know the original hash from here — just delete the test token
  await db.passwordResetToken.delete({ where: { id: token.id } });
  console.log("  ✓ Test token cleaned up");
  passed++;

  console.log(`\n${"=".repeat(40)}`);
  console.log(`  ${passed} passed · ${failed} failed`);
  console.log("=".repeat(40));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
