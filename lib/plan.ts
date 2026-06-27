// lib/plan.ts
// Central source of truth for plan limits and feature gating.
// Every API route that touches a paid feature calls requirePlan() first.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Plan } from "@prisma/client";

// ─── Plan limits ──────────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<
  Plan,
  {
    sources:      number;
    refreshHours: number;
    bookmarks:    boolean;
    chat:         boolean;
    apiAccess:    boolean;
    regenSummary: boolean;
    customCats:   boolean;
    emailDigest:  boolean;
  }
> = {
  FREE: {
    sources:      5,
    refreshHours: 24,
    bookmarks:    false,
    chat:         false,
    apiAccess:    false,
    regenSummary: false,
    customCats:   false,
    emailDigest:  false,
  },
  PRO: {
    sources:      50,
    refreshHours: 24,
    bookmarks:    true,
    chat:         true,
    apiAccess:    true,
    regenSummary: true,
    customCats:   true,
    emailDigest:  true,
  },
  TEAM: {
    sources:      200,
    refreshHours: 1,
    bookmarks:    true,
    chat:         true,
    apiAccess:    true,
    regenSummary: true,
    customCats:   true,
    emailDigest:  true,
  },
};

// ─── Plan ordering ────────────────────────────────────────────────────────────

const PLAN_ORDER: Plan[] = ["FREE", "PRO", "TEAM"];

export function planMeetsMinimum(userPlan: Plan, minPlan: Plan): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan);
}

// ─── requirePlan — throw-based guard for API routes ───────────────────────────
// Usage:
//   try { await requirePlan("PRO"); }
//   catch (e) { return planError(e) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

export async function requirePlan(minPlan: Plan) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const user = await db.user.findUniqueOrThrow({
    where:  { id: session.user.id },
    select: { plan: true },
  });

  if (!planMeetsMinimum(user.plan, minPlan)) {
    throw new Error(`PLAN_REQUIRED:${minPlan}`);
  }

  return user;
}

// ─── planError — convert thrown errors into NextResponse ──────────────────────

export function planError(error: unknown): Response | null {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.startsWith("PLAN_REQUIRED:")) {
    const needed = msg.split(":")[1] as Plan;
    return Response.json(
      {
        error:   `This feature requires the ${needed} plan.`,
        upgrade: true,
        needed,
      },
      { status: 403 }
    );
  }

  if (msg === "UNAUTHENTICATED") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
