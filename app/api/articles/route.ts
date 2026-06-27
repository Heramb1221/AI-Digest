// app/api/articles/route.ts
// Returns articles the user has seen, with optional filters.
//
// Query params:
//   category   — TECHNICAL | BUSINESS | TRENDS | TOOLS | NEWS | UNCATEGORISED | ALL
//   sourceId   — filter to a specific source
//   bookmarks  — "true" to show bookmarked only
//   page       — 1-indexed, default 1
//   pageSize   — default 30, max 100
//
// Sort: importance DESC, publishedAt DESC (most important new articles first)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";
import type { Category } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE     = 100;

const VALID_CATEGORIES = new Set<string>([
  "TECHNICAL", "BUSINESS", "TRENDS", "TOOLS", "NEWS", "UNCATEGORISED",
]);

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;
  const { searchParams } = req.nextUrl;

  // ── Parse query params ──────────────────────────────────────────────────────
  const category    = searchParams.get("category") ?? "ALL";
  const sourceId    = searchParams.get("sourceId")  ?? undefined;
  const bookmarks   = searchParams.get("bookmarks") === "true";
  const page        = Math.max(1, Number(searchParams.get("page")     ?? "1"));
  const pageSize    = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)))
  );
  const skip = (page - 1) * pageSize;

  // ── Build WHERE clause ──────────────────────────────────────────────────────
  // Base: articles this user has seen (or bookmarked)
  const userFilter = bookmarks
    ? { bookmarks: { some: { userId } } }
    : { seenBy:    { some: { userId } } };

  const categoryFilter =
    category !== "ALL" && VALID_CATEGORIES.has(category)
      ? { category: category as Category }
      : {};

  const sourceFilter = sourceId ? { sourceId } : {};

  const where = {
    ...userFilter,
    ...categoryFilter,
    ...sourceFilter,
    // Only show articles with a URL (sanity guard)
    url: { not: "" },
  };

  // ── Query ───────────────────────────────────────────────────────────────────
  const [articles, total] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: [
        { importance:  "desc" },
        { publishedAt: "desc" },
        { fetchedAt:   "desc" }, // fallback if no publishedAt
      ],
      skip,
      take: pageSize,
      include: {
        source: {
          select: { name: true, type: true, faviconUrl: true },
        },
        bookmarks: {
          where:  { userId },
          select: { id: true },
        },
      },
    }),
    db.article.count({ where }),
  ]);

  // ── Shape response ──────────────────────────────────────────────────────────
  const shaped = articles.map((a) => ({
    id:           a.id,
    title:        a.title,
    url:          a.url,
    summary:      a.summary,
    category:     a.category,
    importance:   a.importance,
    publishedAt:  a.publishedAt,
    fetchedAt:    a.fetchedAt,
    isBookmarked: a.bookmarks.length > 0,
    source: {
      name:       a.source.name,
      type:       a.source.type,
      faviconUrl: a.source.faviconUrl,
    },
  }));

  return NextResponse.json({
    articles: shaped,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore:    skip + pageSize < total,
  });
}
