// app/api/team/members/[memberId]/route.ts
// PATCH { role } — change a member's role (OWNER only for ADMIN→OWNER; OWNER/ADMIN otherwise)
// DELETE        — remove a member from the team

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const session  = await auth();
  const userId   = session!.user.id;
  const { role } = await req.json();

  if (!["MEMBER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Caller must be team OWNER or ADMIN
  const callerMembership = await db.teamMember.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!callerMembership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const target = await db.teamMember.findUnique({
    where: { id: params.memberId },
  });
  if (!target || target.teamId !== callerMembership.teamId) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // Can't change OWNER's role
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change the team owner's role." }, { status: 400 });
  }
  // Only OWNER can promote to ADMIN
  if (role === "ADMIN" && callerMembership.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can promote to admin." }, { status: 403 });
  }

  const updated = await db.teamMember.update({
    where: { id: params.memberId },
    data:  { role },
  });

  return NextResponse.json({ id: updated.id, role: updated.role });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const session = await auth();
  const userId  = session!.user.id;

  // Caller must be OWNER or ADMIN, or removing themselves
  const callerMembership = await db.teamMember.findFirst({
    where: { userId },
  });
  if (!callerMembership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const target = await db.teamMember.findUnique({ where: { id: params.memberId } });
  if (!target || target.teamId !== callerMembership.teamId) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // Can't remove the OWNER
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the team owner." }, { status: 400 });
  }

  // Non-admin can only remove themselves
  const isSelf      = target.userId === userId;
  const isPrivileged = ["OWNER", "ADMIN"].includes(callerMembership.role);
  if (!isSelf && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await db.teamMember.delete({ where: { id: params.memberId } });
  return new NextResponse(null, { status: 204 });
}
