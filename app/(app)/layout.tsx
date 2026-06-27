// app/(app)/layout.tsx
// Wraps every authenticated page (dashboard, settings, team).
// Fetches the session server-side and passes user data to the shell.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Middleware already handles the redirect, but this is a belt-and-suspenders guard
  if (!session?.user) redirect("/login");

  return (
    <AppShell user={session.user}>
      {children}
    </AppShell>
  );
}
