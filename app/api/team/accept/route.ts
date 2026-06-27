// app/api/team/accept/route.ts
// POST { token } — validates the invite token and adds the user to the team.
// Called from /accept-invite page after the user signs in or signs up.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }

  // Load the invite
  const invite = await db.teamInvite.findUnique({ where: { token } });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  }
  if (invite.acceptedAt) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link has expired." }, { status: 410 });
  }

  // Verify the signed-in user's email matches the invite email
  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { email: true },
  });

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Sign in with that email to accept it.` },
      { status: 403 }
    );
  }

  // Check user isn't already in this team
  const existing = await db.teamMember.findFirst({
    where: { userId, teamId: invite.teamId },
  });
  if (existing) {
    // Mark invite as accepted and redirect
    await db.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return NextResponse.json({ message: "You're already in this team.", teamId: invite.teamId });
  }

  // Add user to team + mark invite accepted (atomic)
  await db.$transaction([
    db.teamMember.create({
      data: {
        userId,
        teamId: invite.teamId,
        role:   invite.role,
      },
    }),
    db.teamInvite.update({
      where: { id: invite.id },
      data:  { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    message: "You've joined the team!",
    teamId:  invite.teamId,
  });
}
