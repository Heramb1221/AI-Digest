// app/(app)/dashboard/page.tsx
// Phase 2: Full sidebar + reader dashboard.
// Server component — loads initial data then hands off to DashboardClient.

import type { Metadata }      from "next";
import { auth }               from "@/lib/auth";
import { db }                 from "@/lib/db";
import { DashboardClient }    from "./dashboard-client";
import { UpgradedToast }      from "./upgraded-toast";

export const metadata: Metadata = { title: "Digest" };

export default async function DashboardPage() {
  const session = await auth();
  const userId  = session!.user.id;
  const plan    = (session!.user as any).plan ?? "FREE";

  const sources = await db.source.findMany({
    where:   { userId, isActive: true },
    orderBy: { createdAt: "asc" },
    select:  { id: true, name: true, url: true, type: true, faviconUrl: true },
  });

  return (
    <>
      {/* Self-contained Suspense inside UpgradedToast */}
      <UpgradedToast />
      <DashboardClient
        sources={sources}
        plan={plan}
        userName={session!.user.name}
      />
    </>
  );
}
