// app/api/digest/run/route.ts
// Manual refresh — triggered from the dashboard "Refresh" button.
//
// Rate limiting:
//   Free/PRO:   max 1 manual run per hour
//   TEAM:       max 1 manual run per 30 minutes
//
// The job runs in the background after responding with 202 Accepted.
// The client polls GET /api/digest/status to track completion.

import { NextResponse } from "next/server";
import { auth }               from "@/lib/auth";
import { db }                 from "@/lib/db";
import { runDigestForUser }   from "@/lib/digest";
import { PLAN_LIMITS }        from "@/lib/plan";

export async function POST() {
  const session = await auth();
  const userId  = session!.user.id;

  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { plan: true, geminiApiKey: true },
  });

  // ── Rate limit check ────────────────────────────────────────────────────────
  const cooldownMs = user.plan === "TEAM"
    ? 30 * 60 * 1000   // 30 min for team
    : 60 * 60 * 1000;  // 1 hour for free/pro

  const recentRun = await db.digestRun.findFirst({
    where: {
      userId,
      startedAt: { gte: new Date(Date.now() - cooldownMs) },
      status:    { in: ["done", "running"] },
    },
    orderBy: { startedAt: "desc" },
  });

  if (recentRun?.status === "running") {
    return NextResponse.json(
      { error: "A digest refresh is already in progress.", running: true },
      { status: 429 }
    );
  }

  if (recentRun?.status === "done") {
    const cooldownMinutes = cooldownMs / 60_000;
    return NextResponse.json(
      {
        error:      `You can only manually refresh once every ${cooldownMinutes} minutes.`,
        retryAfter: new Date(recentRun.startedAt.getTime() + cooldownMs).toISOString(),
      },
      { status: 429 }
    );
  }

  // ── Check user has at least one source ──────────────────────────────────────
  const sourceCount = await db.source.count({
    where: { userId, isActive: true },
  });

  if (sourceCount === 0) {
    return NextResponse.json(
      { error: "Add at least one source before running a digest." },
      { status: 400 }
    );
  }

  // ── Fire and forget — respond 202 immediately ───────────────────────────────
  // We don't await so the HTTP response is instant.
  // The client polls /api/digest/status for completion.
  runDigestForUser(userId, user.geminiApiKey).catch((err) => {
    console.error("[digest/run] Background run failed for user", userId, err);
  });

  return NextResponse.json(
    { message: "Digest refresh started. Poll /api/digest/status for updates." },
    { status: 202 }
  );
}
