// app/api/team/invite/route.ts
// POST — send an invite email + create a TeamInvite token
// GET  — list pending invites for this team (OWNER/ADMIN only)

import { NextRequest, NextResponse } from "next/server";
import { auth }                 from "@/lib/auth";
import { db }                   from "@/lib/db";
import { sendTeamInviteEmail }  from "@/lib/email";

const INVITE_TTL_DAYS = 7;

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const membership = await db.teamMember.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
    select: { teamId: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await db.teamInvite.findMany({
    where:   { teamId: membership.teamId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;

  const { email, role = "MEMBER" } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!["MEMBER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Role must be MEMBER or ADMIN." }, { status: 400 });
  }

  // Caller must be OWNER or ADMIN
  const membership = await db.teamMember.findFirst({
    where:   { userId, role: { in: ["OWNER", "ADMIN"] } },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!membership) {
    return NextResponse.json({ error: "You must be a team owner or admin to invite." }, { status: 403 });
  }

  // Check target isn't already a member
  const alreadyMember = await db.teamMember.findFirst({
    where: { teamId: membership.team.id, user: { email: email.trim().toLowerCase() } },
  });
  if (alreadyMember) {
    return NextResponse.json({ error: "That person is already in your team." }, { status: 409 });
  }

  // Revoke any existing pending invite for this email+team
  await db.teamInvite.deleteMany({
    where: { teamId: membership.team.id, email: email.trim().toLowerCase(), acceptedAt: null },
  });

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invite = await db.teamInvite.create({
    data: {
      teamId:    membership.team.id,
      email:     email.trim().toLowerCase(),
      role:      role as "MEMBER" | "ADMIN",
      createdBy: userId,
      expiresAt,
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/accept-invite?token=${invite.token}`;

  const inviter = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { name: true, email: true },
  });

  const { success, error } = await sendTeamInviteEmail(
    email.trim(),
    inviter.name ?? inviter.email,
    membership.team.name,
    inviteUrl
  );

  if (!success) {
    // Roll back the invite if email fails
    await db.teamInvite.delete({ where: { id: invite.id } });
    return NextResponse.json({ error: error ?? "Failed to send invite email." }, { status: 503 });
  }

  return NextResponse.json({ message: `Invite sent to ${email}.`, inviteId: invite.id });
}
