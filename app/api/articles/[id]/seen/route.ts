// app/api/articles/[id]/seen/route.ts
// Marks an article as seen for the current user.
// Uses upsert so it's safe to call multiple times (idempotent).
// Called automatically when a user opens an article in the reader pane.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session   = await auth();
  const userId    = session!.user.id;
  const articleId = params.id;

  // Verify article exists
  const article = await db.article.findUnique({
    where:  { id: articleId },
    select: { id: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  await db.seenArticle.upsert({
    where:  { userId_articleId: { userId, articleId } },
    create: { userId, articleId },
    update: {},
  });

  return new NextResponse(null, { status: 204 });
}
