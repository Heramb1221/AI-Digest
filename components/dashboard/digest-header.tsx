"use client";
// components/dashboard/digest-header.tsx
// Top bar above the article list — shows last run time, article count,
// and the manual refresh button with live status feedback.

import { RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useDigestStatus } from "@/hooks/use-digest-status";

interface DigestHeaderProps {
  onRefreshed: () => void;   // called after a successful run to reload articles
}

export function DigestHeader({ onRefreshed }: DigestHeaderProps) {
  const { status, triggering, error, triggerRefresh } = useDigestStatus();

  async function handleRefresh() {
    const ok = await triggerRefresh();
    if (ok) {
      // Poll until done, then reload the article list
      const poll = setInterval(async () => {
        const res  = await fetch("/api/digest/status");
        const data = await res.json();
        if (!data.isRunning) {
          clearInterval(poll);
          onRefreshed();
        }
      }, 3000);
      // Safety timeout — stop polling after 3 minutes
      setTimeout(() => clearInterval(poll), 180_000);
    }
  }

  const isRunning  = status?.isRunning ?? false;
  const lastRun    = status?.lastRun;
  const nextRunAt  = status?.nextRunAt;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
      {/* Left: status info */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Run status indicator */}
        {isRunning ? (
          <span className="flex items-center gap-1.5 text-2xs text-blue-500 font-medium">
            <Loader2 size={11} className="animate-spin" />
            Refreshing…
          </span>
        ) : lastRun?.status === "failed" ? (
          <span className="flex items-center gap-1.5 text-2xs text-red-500 font-medium">
            <AlertCircle size={11} />
            Last run failed
          </span>
        ) : lastRun ? (
          <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
            <CheckCircle2 size={11} className="text-green-500 shrink-0" />
            <span className="truncate">
              {lastRun.articlesNew > 0
                ? `${lastRun.articlesNew} new · `
                : "Up to date · "}
              {formatDate(lastRun.completedAt ?? lastRun.startedAt)}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
            <Clock size={11} />
            No digest yet
          </span>
        )}

        {/* Next run time */}
        {nextRunAt && !isRunning && (
          <span className="hidden sm:inline text-2xs text-ink-faint">
            · Next: {new Date(nextRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Right: refresh button */}
      <div className="flex items-center gap-2 shrink-0">
        {error && (
          <span className="text-2xs text-red-500 hidden sm:block">{error}</span>
        )}
        <button
          onClick={handleRefresh}
          disabled={isRunning || triggering}
          title="Manually refresh your digest"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium",
            "border border-border transition-colors",
            (isRunning || triggering)
              ? "text-ink-faint cursor-not-allowed bg-paper-sunken"
              : "text-ink-muted bg-paper-raised hover:bg-paper-sunken hover:text-ink"
          )}
        >
          <RefreshCw
            size={12}
            className={cn((isRunning || triggering) && "animate-spin")}
          />
          {isRunning || triggering ? "Refreshing" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
