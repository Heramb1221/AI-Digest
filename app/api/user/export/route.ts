// app/api/user/export/route.ts
// GET — returns a JSON export of all data associated with the current user.
// Satisfies GDPR Article 20 (right to data portability).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const [user, sources, seenArticles, bookmarks, digestRuns, referrals] =
    await Promise.all([
      db.user.findUniqueOrThrow({
        where:  { id: userId },
        select: {
          id:                 true,
          name:               true,
          email:              true,
          plan:               true,
          digestEmailEnabled: true,
          referralCode:       true,
          referredBy:         true,
          createdAt:          true,
          // Never include passwordHash or geminiApiKey in export
        },
      }),
      db.source.findMany({
        where:   { userId },
        select:  { id: true, name: true, url: true, type: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      db.seenArticle.findMany({
        where:   { userId },
        select:  { articleId: true, seenAt: true },
        orderBy: { seenAt: "desc" },
        take:    1000, // cap for large accounts
      }),
      db.bookmark.findMany({
        where:   { userId },
        include: { article: { select: { title: true, url: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.digestRun.findMany({
        where:   { userId },
        select:  { id: true, status: true, startedAt: true, articlesNew: true, articlesSeen: true },
        orderBy: { startedAt: "desc" },
        take:    90,
      }),
      db.referralReward.findMany({
        where:   { referrerId: userId },
        select:  { refereeId: true, months: true, awardedAt: true },
      }),
    ]);

  const exportData = {
    exportedAt:  new Date().toISOString(),
    exportNote:  "This file contains all data AI Digest holds about your account.",
    user,
    sources,
    seenArticles: {
      count: seenArticles.length,
      note:  "Showing most recent 1000 seen articles.",
      items: seenArticles,
    },
    bookmarks:    bookmarks.map((b) => ({
      articleId: b.articleId,
      title:     b.article.title,
      url:       b.article.url,
      savedAt:   b.createdAt,
    })),
    digestRuns:  { count: digestRuns.length, items: digestRuns },
    referrals:   referrals,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="ai-digest-export-${userId}.json"`,
    },
  });
}
