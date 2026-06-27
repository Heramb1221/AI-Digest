// app/api/admin/route.ts
// Internal admin stats — only accessible to the account whose email
// matches ADMIN_EMAIL env var. Returns aggregate platform metrics.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only the configured admin can access this
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now     = new Date();
  const day7    = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const day30   = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today   = new Date(now); today.setUTCHours(0, 0, 0, 0);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    planBreakdown,
    totalSources,
    activeSources,
    unhealthySources,
    totalArticles,
    articlesToday,
    totalDigestRuns,
    digestRunsToday,
    failedRunsToday,
    avgArticlesPerRun,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: day7 } } }),
    db.user.count({ where: { createdAt: { gte: day30 } } }),
    db.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    db.source.count(),
    db.source.count({ where: { isActive: true } }),
    db.sourceHealth.count({ where: { isHealthy: false } }),
    db.article.count(),
    db.article.count({ where: { fetchedAt: { gte: today } } }),
    db.digestRun.count(),
    db.digestRun.count({ where: { startedAt: { gte: today } } }),
    db.digestRun.count({ where: { startedAt: { gte: today }, status: "failed" } }),
    db.digestRun.aggregate({
      _avg: { articlesNew: true },
      where: { status: "done", startedAt: { gte: day7 } },
    }),
  ]);

  // Daily active users = users who had a DigestRun today
  const dauResult = await db.digestRun.findMany({
    where:   { startedAt: { gte: today }, status: "done" },
    select:  { userId: true },
    distinct: ["userId"],
  });

  return NextResponse.json({
    users: {
      total:     totalUsers,
      new7d:     newUsers7d,
      new30d:    newUsers30d,
      dau:       dauResult.length,
      byPlan:    Object.fromEntries(planBreakdown.map((p) => [p.plan, p._count._all])),
    },
    sources: {
      total:     totalSources,
      active:    activeSources,
      unhealthy: unhealthySources,
    },
    articles: {
      total:       totalArticles,
      today:       articlesToday,
    },
    digestRuns: {
      total:       totalDigestRuns,
      today:       digestRunsToday,
      failedToday: failedRunsToday,
      avgNewArticles7d: Math.round(avgArticlesPerRun._avg.articlesNew ?? 0),
    },
    timestamp: now.toISOString(),
  });
}
