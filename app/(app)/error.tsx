"use client";
// app/(app)/error.tsx
// Error boundary for all authenticated app pages.
// Catches render-time errors without crashing the whole layout.

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle size={22} className="text-red-500" />
      </div>
      <h2 className="text-base font-semibold mb-1">Something went wrong</h2>
      <p className="text-sm text-ink-muted mb-6 max-w-xs">
        An error occurred loading this page. Try again or return to the dashboard.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-ink-faint mb-4">ID: {error.digest}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button size="sm" variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
