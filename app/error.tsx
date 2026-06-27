"use client";
// app/error.tsx
// Next.js App Router global error boundary.
// Catches unhandled runtime errors in the render tree.

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error:  Error & { digest?: string };
  reset:  () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to your error monitoring service here (Sentry, etc.)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-6">
      <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
        <span className="text-2xl">⚠</span>
      </div>
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-ink-muted mb-2 max-w-xs">
        An unexpected error occurred. This has been logged and we'll look into it.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-ink-faint mb-6">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
