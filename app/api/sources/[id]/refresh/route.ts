// app/api/sources/[id]/refresh/route.ts
// POST — manually refreshes a single source for the current user.
// Useful for testing a new source immediately after adding it
// without waiting for the daily cron.
//
// Rate limit: 1 refresh per source per 10 minutes.

import { NextRequest, NextResponse } from "next/server";
import { auth }             from "@/lib/auth";
import { db }               from "@/lib/db";
import { fetchSource }      from "@/lib/fetchers";
import { analyseArticle }   from "@/lib/gemini";
import { decryptIfPresent } from "@/lib/crypto";
import type { Category }    from "@prisma/client";

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId  = session!.user.id;

  // Verify source ownership
  const source = await db.source.findFirst({
    where: { id: params.id, userId, isActive: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  // Rate limit: check lastFetched
  if (source.lastFetched) {
    const elapsed = Date.now() - source.lastFetched.getTime();
    if (elapsed < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec}s before refreshing this source again.` },
        { status: 429 }
      );
    }
  }

  // Fetch the source
  const { items, error } = await fetchSource(source.type, source.url);
  if (error && items.length === 0) {
    return NextResponse.json({ error: `Fetch failed: ${error}` }, { status: 502 });
  }

  // Get user's API key (decrypted)
  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { geminiApiKey: true },
  });
  const apiKey = await decryptIfPresent(user.geminiApiKey);

  let newCount  = 0;
  let seenCount = 0;

  for (const item of items) {
    if (!item.url || !item.title) continue;

    const existing = await db.article.findUnique({
      where:  { url: item.url },
      select: { id: true },
    });

    if (existing) {
      await db.seenArticle.upsert({
        where:  { userId_articleId: { userId, articleId: existing.id } },
        create: { userId, articleId: existing.id },
        update: {},
      });
      seenCount++;
      continue;
    }

    // New article — analyse
    const analysis = await analyseArticle(item.title, item.content, apiKey);

    try {
      const article = await db.article.create({
        data: {
          sourceId:    source.id,
          title:       item.title.slice(0, 500),
          url:         item.url,
          content:     item.content?.slice(0, 10_000) ?? null,
          summary:     analysis.summary    || null,
          category:    analysis.category   as Category,
          importance:  analysis.importance,
          publishedAt: item.publishedAt,
        },
      });
      await db.seenArticle.create({ data: { userId, articleId: article.id } });
      newCount++;
    } catch (e: any) {
      if (e?.code === "P2002") seenCount++;
    }
  }

  // Update lastFetched
  await db.source.update({
    where: { id: source.id },
    data:  { lastFetched: new Date() },
  });

  return NextResponse.json({
    message:     `Refreshed "${source.name}"`,
    articlesNew:  newCount,
    articlesSeen: seenCount,
  });
}
