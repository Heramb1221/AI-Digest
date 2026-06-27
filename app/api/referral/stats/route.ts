// app/api/referral/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

export async function GET() {
  const session = await auth();
  const userId  = session!.user.id;

  const user = await db.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { referralCode: true },
  });

  const [rewards, totalReferred] = await Promise.all([
    db.referralReward.findMany({
      where:   { referrerId: userId },
      orderBy: { awardedAt: "desc" },
    }),
    db.user.count({ where: { referredBy: userId } }),
  ]);

  const referralUrl = `${process.env.NEXTAUTH_URL}/signup?ref=${user.referralCode}`;

  return NextResponse.json({
    referralCode:  user.referralCode,
    referralUrl,
    totalReferred,
    totalMonths:   rewards.reduce((s, r) => s + r.months, 0),
    rewards:       rewards.map((r) => ({
      id:        r.id,
      refereeId: r.refereeId,
      months:    r.months,
      awardedAt: r.awardedAt.toISOString(),
    })),
  });
}
