// app/api/user/delete/route.ts
// DELETE — permanently deletes the user's account and all associated data.
// Requires password confirmation to prevent accidental deletion.

import { NextRequest, NextResponse } from "next/server";
import { auth }     from "@/lib/auth";
import { db }       from "@/lib/db";
import bcrypt       from "bcryptjs";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;

  const { password } = await req.json();

  if (!password) {
    return NextResponse.json({ error: "Password confirmation required." }, { status: 400 });
  }

  // Verify password before deleting
  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { passwordHash: true },
  });

  if (!user.passwordHash) {
    return NextResponse.json({ error: "Cannot verify identity." }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  // Delete user — Prisma cascades handle all related data
  // (sources, articles, seenArticles, bookmarks, digestRuns, teamMemberships)
  await db.user.delete({ where: { id: userId } });

  return NextResponse.json({ deleted: true });
}
