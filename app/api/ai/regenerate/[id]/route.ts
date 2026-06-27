// app/api/ai/regenerate/[id]/route.ts
// Re-runs Gemini analysis on an existing article and updates its summary,
// category, and importance score in the database.
// Requires PRO plan.
//
// Use case: user wants a longer explanation or the auto-summary missed the point.

import { NextRequest, NextResponse } from "next/server";
import { auth }                   from "@/lib/auth";
import { db }                     from "@/lib/db";
import { requirePlan, planError } from "@/lib/plan";
import { analyseArticle }         from "@/lib/gemini";

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

  // Verify ownership
  const seen = await db.seenArticle.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });
  if (!seen) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  const article = await db.article.findUnique({
    where:  { id: articleId },
    select: { title: true, content: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  // ── Re-run AI analysis ──────────────────────────────────────────────────────
  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { geminiApiKey: true },
  });

  const analysis = await analyseArticle(
    article.title,
    article.content ?? "",
    user.geminiApiKey
  );

  // ── Update article ──────────────────────────────────────────────────────────
  const updated = await db.article.update({
    where: { id: articleId },
    data:  {
      summary:    analysis.summary,
      category:   analysis.category as any,
      importance: analysis.importance,
    },
    select: { id: true, summary: true, category: true, importance: true },
  });

  return NextResponse.json(updated);
}
