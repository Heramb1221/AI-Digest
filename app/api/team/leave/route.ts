// app/api/team/leave/route.ts
// POST — removes the current user from their team.
// Rules:
//   - The OWNER cannot leave (they must transfer ownership or delete the team)
//   - Any ADMIN or MEMBER can leave at any time
//   - After leaving, the user has no team affiliation

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function POST() {
  const session = await auth();
  const userId  = session!.user.id;

  const membership = await db.teamMember.findFirst({
    where:  { userId },
    select: { id: true, role: true, teamId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not in a team." }, { status: 400 });
  }

  if (membership.role === "OWNER") {
    // Count other members — if the team would be empty, delete it instead
    const otherCount = await db.teamMember.count({
      where: { teamId: membership.teamId, userId: { not: userId } },
    });

    if (otherCount === 0) {
      // Last member — delete the whole team (cascades via Prisma)
      await db.team.delete({ where: { id: membership.teamId } });
      return NextResponse.json({ message: "Team deleted (you were the only member)." });
    }

    return NextResponse.json(
      {
        error:
          "Team owners cannot leave. Transfer ownership to another admin first, " +
          "or delete the team from Settings.",
      },
      { status: 400 }
    );
  }

  await db.teamMember.delete({ where: { id: membership.id } });

  return NextResponse.json({ message: "You have left the team." });
}
