// app/api/health/route.ts
// Public endpoint — used by Vercel and uptime monitors.
// Does NOT require authentication (excluded in middleware).

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Lightweight DB ping — confirms Neon connection is alive
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 503 }
    );
  }
}
