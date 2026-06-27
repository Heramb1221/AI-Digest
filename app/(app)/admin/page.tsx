// app/(app)/admin/page.tsx
// Internal admin dashboard — shows platform-wide metrics.
// Only renders for the configured ADMIN_EMAIL user.

import { redirect }  from "next/navigation";
import { auth }      from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };

// Revalidate every 60 seconds so stats stay fresh
export const revalidate = 60;

async function getAdminStats() {
  // Call our own API — consistent with what external monitoring would see
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin`, {
    headers: { Cookie: "" }, // server-side fetch won't have cookies — handled below
    cache:   "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || session.user.email !== adminEmail) {
    redirect("/dashboard");
  }

  // Direct DB query for admin (avoids cookie-based auth complexity in server fetch)
  const { db } = await import("@/lib/db");
  const now   = new Date();
  const day7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = new Date(now); today.setUTCHours(0, 0, 0, 0);

  const [
    totalUsers, newUsers7d, newUsers30d,
    planBreakdown,
    totalSources, activeSources, unhealthySources,
    totalArticles, articlesToday,
    digestRunsToday, failedRunsToday,
    recentRuns,
    recentErrors,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: day7  } } }),
    db.user.count({ where: { createdAt: { gte: day30 } } }),
    db.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    db.source.count(),
    db.source.count({ where: { isActive: true } }),
    db.sourceHealth.count({ where: { isHealthy: false } }),
    db.article.count(),
    db.article.count({ where: { fetchedAt: { gte: today } } }),
    db.digestRun.count({ where: { startedAt: { gte: today } } }),
    db.digestRun.count({ where: { startedAt: { gte: today }, status: "failed" } }),
    db.digestRun.findMany({
      orderBy: { startedAt: "desc" },
      take:    10,
      include: { user: { select: { email: true } } },
    }),
    db.digestRunLog.findMany({
      where:   { status: "error", createdAt: { gte: day7 } },
      orderBy: { createdAt: "desc" },
      take:    20,
    }),
  ]);

  const dauResult = await db.digestRun.findMany({
    where:    { startedAt: { gte: today }, status: "done" },
    select:   { userId: true },
    distinct: ["userId"],
  });

  const planMap = Object.fromEntries(planBreakdown.map((p) => [p.plan, p._count._all]));

  const statCards = [
    { label: "Total users",       value: totalUsers,        sub: `+${newUsers7d} this week` },
    { label: "DAU today",         value: dauResult.length,  sub: `${digestRunsToday} runs` },
    { label: "Active sources",    value: activeSources,     sub: `${unhealthySources} unhealthy` },
    { label: "Articles today",    value: articlesToday,     sub: `${totalArticles.toLocaleString()} total` },
    { label: "Failed runs today", value: failedRunsToday,   sub: `${digestRunsToday} total today` },
    { label: "PRO users",         value: planMap.PRO ?? 0,  sub: `${planMap.TEAM ?? 0} TEAM` },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold">Admin</h1>
          <p className="text-sm text-ink-muted">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className="text-xs bg-red-50 text-red-600 font-semibold px-2.5 py-1 rounded-full border border-red-200">
          Internal only
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {statCards.map(({ label, value, sub }) => (
          <div key={label} className="border border-border rounded-xl p-4 bg-paper-raised">
            <p className="text-2xs text-ink-faint font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
            <p className="text-xs text-ink-faint mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Plan breakdown</h2>
        <div className="flex gap-2">
          {(["FREE", "PRO", "TEAM"] as const).map((plan) => {
            const count = planMap[plan] ?? 0;
            const pct   = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
            return (
              <div key={plan} className="border border-border rounded-lg px-3 py-2 bg-paper-raised flex-1 text-center">
                <p className="text-xs font-semibold text-ink-muted">{plan}</p>
                <p className="text-lg font-semibold">{count}</p>
                <p className="text-2xs text-ink-faint">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent digest runs */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Recent digest runs</h2>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-paper-sunken">
                <th className="text-left px-4 py-2 text-ink-faint font-medium">User</th>
                <th className="text-left px-4 py-2 text-ink-faint font-medium">Status</th>
                <th className="text-right px-4 py-2 text-ink-faint font-medium">New</th>
                <th className="text-right px-4 py-2 text-ink-faint font-medium">Seen</th>
                <th className="text-left px-4 py-2 text-ink-faint font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-b border-border/50 hover:bg-paper-sunken">
                  <td className="px-4 py-2 truncate max-w-[160px]">{run.user.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-2xs font-medium ${
                      run.status === "done"    ? "bg-green-50 text-green-600" :
                      run.status === "running" ? "bg-blue-50 text-blue-600"  :
                                                 "bg-red-50 text-red-500"
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{run.articlesNew}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{run.articlesSeen}</td>
                  <td className="px-4 py-2 text-ink-faint">
                    {new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent source errors */}
      {recentErrors.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Source errors (last 7 days)</h2>
          <div className="flex flex-col gap-1.5">
            {recentErrors.map((log) => (
              <div key={log.id} className="border border-red-100 bg-red-50 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-red-800">{log.sourceName}</p>
                <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{log.error}</p>
                <p className="text-2xs text-red-400 mt-1">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
