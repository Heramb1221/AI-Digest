// app/api/articles/[id]/route.ts
// Returns a single article by ID.
// Verifies the requesting user has a SeenArticle record for it (ownership check).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId  = session!.user.id;

  const article = await db.article.findFirst({
    where: {
      id:    params.id,
      seenBy: { some: { userId } },   // ownership guard
    },
    include: {
      source: {
        select: { name: true, type: true, url: true, faviconUrl: true },
      },
      bookmarks: {
        where:  { userId },
        select: { id: true },
      },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  return NextResponse.json({
    id:           article.id,
    title:        article.title,
    url:          article.url,
    summary:      article.summary,
    content:      article.content,   // full content for the reader pane
    category:     article.category,
    importance:   article.importance,
    publishedAt:  article.publishedAt,
    fetchedAt:    article.fetchedAt,
    isBookmarked: article.bookmarks.length > 0,
    source: {
      name:       article.source.name,
      type:       article.source.type,
      url:        article.source.url,
      faviconUrl: article.source.faviconUrl,
    },
  });
}
