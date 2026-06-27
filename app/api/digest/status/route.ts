// app/api/digest/status/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const lastRun = await db.digestRun.findFirst({
    where:   { userId },
    orderBy: { startedAt: "desc" },
  });

  // Next 06:00 UTC
  const now    = new Date();
  const next   = new Date();
  next.setUTCHours(6, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

  return NextResponse.json({
    lastRun,
    isRunning: lastRun?.status === "running",
    nextRunAt: next.toISOString(),
  });
}
