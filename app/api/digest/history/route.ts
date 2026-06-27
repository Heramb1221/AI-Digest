// app/api/digest/history/route.ts
// Returns paginated digest run history for the current user,
// including per-source logs for the most recent runs.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;
  const page    = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit   = 20;
  const skip    = (page - 1) * limit;

  const [runs, total] = await Promise.all([
    db.digestRun.findMany({
      where:   { userId },
      orderBy: { startedAt: "desc" },
      skip,
      take:    limit,
    }),
    db.digestRun.count({ where: { userId } }),
  ]);

  // Attach per-source logs only for the most recent 5 runs (keep response lean)
  const recentRunIds = runs.slice(0, 5).map((r) => r.id);
  const logs = await db.digestRunLog.findMany({
    where:   { digestRunId: { in: recentRunIds } },
    orderBy: { createdAt:   "asc" },
  });

  const logsById = logs.reduce<Record<string, typeof logs>>((acc, l) => {
    acc[l.digestRunId] = [...(acc[l.digestRunId] ?? []), l];
    return acc;
  }, {});

  return NextResponse.json({
    runs: runs.map((r) => ({
      ...r,
      logs: logsById[r.id] ?? [],
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
