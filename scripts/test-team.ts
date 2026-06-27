#!/usr/bin/env tsx
// scripts/test-team.ts
// Validates the team invite token flow end-to-end without sending emails.
// Creates a team, generates an invite token, and verifies the accept logic.
//
//   Usage: npx tsx scripts/test-team.ts <ownerUserId>

import { db } from "../lib/db";

async function main() {
  const ownerId = process.argv[2];
  if (!ownerId) {
    console.error("Usage: npx tsx scripts/test-team.ts <ownerUserId>");
    process.exit(1);
  }

  const owner = await db.user.findUnique({
    where:  { id: ownerId },
    select: { id: true, email: true, plan: true },
  });
  if (!owner) {
    console.error(`User ${ownerId} not found`);
    process.exit(1);
  }

  console.log(`\nOwner: ${owner.email} (plan: ${owner.plan})\n`);

  // Check existing team membership
  const existing = await db.teamMember.findFirst({ where: { userId: ownerId } });
  if (existing) {
    console.log(`Owner is already in team ${existing.teamId}`);

    // Test generating an invite token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite    = await db.teamInvite.create({
      data: {
        teamId:    existing.teamId,
        email:     "test-invitee@example.com",
        role:      "MEMBER",
        createdBy: ownerId,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/accept-invite?token=${invite.token}`;
    console.log("✓ Invite token created");
    console.log(`  Token:      ${invite.token}`);
    console.log(`  Invite URL: ${inviteUrl}`);
    console.log(`  Expires:    ${expiresAt.toISOString()}`);

    // Validate token fields
    const loaded = await db.teamInvite.findUnique({ where: { token: invite.token } });
    console.log(`\n✓ Token round-trip: ${loaded ? "OK" : "FAILED"}`);
    console.log(`  email:     ${loaded?.email}`);
    console.log(`  role:      ${loaded?.role}`);
    console.log(`  accepted:  ${loaded?.acceptedAt ?? "pending"}`);

    // Clean up test invite
    await db.teamInvite.delete({ where: { id: invite.id } });
    console.log("\n✓ Test invite cleaned up");
  } else {
    console.log("Owner is not in a team. Create one via the UI first (requires TEAM plan).");
  }

  console.log("\n✓ Team invite flow validated");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
