// app/not-found.tsx
// Shown for any unmatched route.

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-6">
      <p className="font-mono text-5xl font-semibold text-ink-faint mb-4">404</p>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-sm text-ink-muted mb-8 max-w-xs">
        This page doesn't exist or was moved. Check the URL or head back to your digest.
      </p>
      <Link href="/dashboard">
        <Button>Go to dashboard</Button>
      </Link>
    </div>
  );
}
