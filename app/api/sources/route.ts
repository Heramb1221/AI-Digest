// app/api/sources/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth }             from "@/lib/auth";
import { db }               from "@/lib/db";
import { PLAN_LIMITS }      from "@/lib/plan";
import { validateRSSFeed }  from "@/lib/fetchers/rss";
import { fetchYouTube }     from "@/lib/fetchers/youtube";
import { fetchReddit }      from "@/lib/fetchers/reddit";
import type { SourceType }  from "@prisma/client";

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const sources = await db.source.findMany({
    where:   { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select:  {
      id:          true,
      name:        true,
      url:         true,
      type:        true,
      isActive:    true,
      lastFetched: true,
      faviconUrl:  true,
      createdAt:   true,
      _count:      { select: { articles: true } },
    },
  });

  // Attach health data
  const healthRows = await db.sourceHealth.findMany({
    where: { sourceId: { in: sources.map((s) => s.id) } },
  });
  const healthById = Object.fromEntries(healthRows.map((h) => [h.sourceId, h]));

  const withHealth = sources.map((s) => ({
    ...s,
    health: healthById[s.id]
      ? {
          consecutiveFails: healthById[s.id].consecutiveFails,
          isHealthy:        healthById[s.id].isHealthy,
          lastError:        healthById[s.id].lastError,
        }
      : null,
  }));

  return NextResponse.json(withHealth);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;

  let body: { type?: string; name?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { type, name, url } = body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!type || !name || !url) {
    return NextResponse.json({ error: "type, name, and url are required." }, { status: 400 });
  }

  const VALID_TYPES: SourceType[] = ["RSS", "YOUTUBE", "REDDIT", "SCRAPE", "EMAIL"];
  if (!VALID_TYPES.includes(type as SourceType)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  // ── Plan limit ──────────────────────────────────────────────────────────────
  const user  = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
  const count = await db.source.count({ where: { userId, isActive: true } });
  const limit = PLAN_LIMITS[user.plan].sources;

  if (count >= limit) {
    return NextResponse.json(
      {
        error:   `You've reached the ${limit}-source limit on the ${user.plan} plan.`,
        upgrade: true,
        limit,
        current: count,
      },
      { status: 403 }
    );
  }

  // ── Source-type validation (test-fetch) ─────────────────────────────────────
  // We do a live test fetch to catch bad URLs early.
  // This adds ~1-5s to the response but saves users from silent failures.
  if (type === "RSS") {
    const check = await validateRSSFeed(url);
    if (!check.valid) {
      return NextResponse.json(
        { error: `Could not read RSS feed: ${check.error ?? "Invalid feed"}` },
        { status: 400 }
      );
    }
  }

  if (type === "YOUTUBE") {
    const result = await fetchYouTube(url);
    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: `Could not access YouTube channel: ${result.error}` },
        { status: 400 }
      );
    }
  }

  if (type === "REDDIT") {
    const result = await fetchReddit(url);
    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: `Could not access subreddit: ${result.error}` },
        { status: 400 }
      );
    }
  }

  // ── Check for duplicate URL for this user ───────────────────────────────────
  const existing = await db.source.findFirst({
    where: { userId, url, isActive: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have this source." },
      { status: 409 }
    );
  }

  // ── Create source ───────────────────────────────────────────────────────────
  const source = await db.source.create({
    data: {
      userId,
      type: type as SourceType,
      name: name.trim().slice(0, 100),
      url:  url.trim(),
    },
  });

  return NextResponse.json(source, { status: 201 });
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
