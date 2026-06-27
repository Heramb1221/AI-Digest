// app/api/team/sources/route.ts
// GET  — list team's shared sources
// POST — add a source to the team (OWNER/ADMIN only)

import { NextRequest, NextResponse } from "next/server";
import { auth }            from "@/lib/auth";
import { db }              from "@/lib/db";
import { PLAN_LIMITS }     from "@/lib/plan";
import { validateRSSFeed } from "@/lib/fetchers/rss";
import { fetchReddit }     from "@/lib/fetchers/reddit";
import { fetchYouTube }    from "@/lib/fetchers/youtube";
import type { SourceType } from "@prisma/client";

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const membership = await db.teamMember.findFirst({
    where:  { userId },
    select: { teamId: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not in a team." }, { status: 403 });
  }

  const sources = await db.source.findMany({
    where:   { teamId: membership.teamId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;

  // Must be OWNER or ADMIN to add team sources
  const membership = await db.teamMember.findFirst({
    where:   { userId, role: { in: ["OWNER", "ADMIN"] } },
    include: { team: { select: { id: true, plan: true } } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Only team owners and admins can add sources." },
      { status: 403 }
    );
  }

  const { type, name, url } = await req.json();

  if (!type || !name || !url) {
    return NextResponse.json({ error: "type, name, and url are required." }, { status: 400 });
  }

  // Plan limit for team
  const limit = PLAN_LIMITS[membership.team.plan].sources;
  const count = await db.source.count({ where: { teamId: membership.team.id, isActive: true } });
  if (count >= limit) {
    return NextResponse.json(
      { error: `Team source limit reached (${limit} for ${membership.team.plan} plan).`, upgrade: true },
      { status: 403 }
    );
  }

  // Validate feed
  if (type === "RSS") {
    const check = await validateRSSFeed(url);
    if (!check.valid) {
      return NextResponse.json({ error: `Invalid RSS feed: ${check.error}` }, { status: 400 });
    }
  }
  if (type === "REDDIT") {
    const result = await fetchReddit(url);
    if (result.error && result.items.length === 0) {
      return NextResponse.json({ error: `Could not access subreddit: ${result.error}` }, { status: 400 });
    }
  }
  if (type === "YOUTUBE") {
    const result = await fetchYouTube(url);
    if (result.error && result.items.length === 0) {
      return NextResponse.json({ error: `Could not access YouTube channel: ${result.error}` }, { status: 400 });
    }
  }

  // Duplicate check
  const dup = await db.source.findFirst({
    where: { teamId: membership.team.id, url, isActive: true },
  });
  if (dup) {
    return NextResponse.json({ error: "This source is already in your team." }, { status: 409 });
  }

  const source = await db.source.create({
    data: {
      teamId: membership.team.id,
      type:   type as SourceType,
      name:   name.trim().slice(0, 100),
      url:    url.trim(),
    },
  });

  return NextResponse.json(source, { status: 201 });
}
