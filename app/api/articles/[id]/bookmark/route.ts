// app/api/articles/[id]/bookmark/route.ts
// Toggles a bookmark on an article. POST creates; calling again removes.
// Requires PRO plan.

import { NextRequest, NextResponse } from "next/server";
import { auth }               from "@/lib/auth";
import { db }                 from "@/lib/db";
import { requirePlan, planError } from "@/lib/plan";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Plan gate ───────────────────────────────────────────────────────────────
  try {
    await requirePlan("PRO");
  } catch (e) {
    const r = planError(e);
    if (r) return r;
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const session   = await auth();
  const userId    = session!.user.id;
  const articleId = params.id;

  // Verify the user has seen this article (ownership check)
  const seen = await db.seenArticle.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });

  if (!seen) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const existing = await db.bookmark.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });

  if (existing) {
    await db.bookmark.delete({
      where: { userId_articleId: { userId, articleId } },
    });
    return NextResponse.json({ bookmarked: false });
  } else {
    await db.bookmark.create({ data: { userId, articleId } });
    return NextResponse.json({ bookmarked: true });
  }
}
