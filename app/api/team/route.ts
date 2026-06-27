// app/api/team/route.ts
// GET  — return current user's team + members (null if no team)
// POST — create a new team (user becomes OWNER, plan must be TEAM)

import { NextRequest, NextResponse } from "next/server";
import { auth }        from "@/lib/auth";
import { db }          from "@/lib/db";
import { requirePlan, planError } from "@/lib/plan";

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const membership = await db.teamMember.findFirst({
    where:   { userId },
    include: {
      team: {
        include: {
          members: {
            include: { user: { select: { name: true, email: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
          sources: {
            where:   { isActive: true },
            orderBy: { createdAt: "desc" },
            select:  { id: true, name: true, url: true, type: true, faviconUrl: true, lastFetched: true },
          },
          _count: { select: { members: true, sources: true } },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ team: null, members: [], myRole: null });
  }

  return NextResponse.json({
    team: {
      id:    membership.team.id,
      name:  membership.team.name,
      slug:  membership.team.slug,
      plan:  membership.team.plan,
      _count: membership.team._count,
    },
    members: membership.team.members.map((m) => ({
      id:   m.id,
      role: m.role,
      user: m.user,
    })),
    sources: membership.team.sources,
    myRole:  membership.role,
  });
}

export async function POST(req: NextRequest) {
  // Team creation requires TEAM plan
  try { await requirePlan("TEAM"); }
  catch (e) {
    const r = planError(e);
    if (r) return r;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  const userId  = session!.user.id;

  // User must not already be in a team
  const existing = await db.teamMember.findFirst({ where: { userId } });
  if (existing) {
    return NextResponse.json(
      { error: "You're already in a team. Leave it first to create a new one." },
      { status: 409 }
    );
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  }

  const slug =
    name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40) +
    "-" + Math.random().toString(36).slice(2, 6);

  const team = await db.team.create({
    data: {
      name:    name.trim().slice(0, 80),
      slug,
      plan:    "TEAM",
      members: { create: { userId, role: "OWNER" } },
    },
  });

  return NextResponse.json(team, { status: 201 });
}
