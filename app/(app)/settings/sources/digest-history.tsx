"use client";
// app/(app)/settings/sources/digest-history.tsx
// Shows the user's last 20 digest runs with per-source log expansion.
// Mounted inside the Sources settings page so users can debug failed feeds.

import { useState, useEffect } from "react";
import { ChevronDown, CheckCircle2, AlertCircle, Clock, Minus } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface DigestRunLog {
  id:           string;
  sourceName:   string;
  status:       string;
  itemsFetched: number;
  itemsNew:     number;
  itemsSeen:    number;
  error:        string | null;
  durationMs:   number | null;
}

interface DigestRun {
  id:           string;
  status:       string;
  startedAt:    string;
  completedAt:  string | null;
  articlesNew:  number;
  articlesSeen: number;
  logs:         DigestRunLog[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok:      <CheckCircle2 size={12} className="text-green-500" />,
  error:   <AlertCircle  size={12} className="text-red-500"   />,
  empty:   <Minus        size={12} className="text-ink-faint" />,
  skipped: <Minus        size={12} className="text-ink-faint" />,
};

export function DigestHistory() {
  const [runs,     setRuns]     = useState<DigestRun[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/digest/history")
      .then((r) => r.json())
      .then((data) => { setRuns(data.runs ?? []); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-paper-sunken rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="mt-6 border border-dashed border-border rounded-xl p-6 text-center">
        <p className="text-sm text-ink-muted">No digest runs yet. Add a source and hit Refresh.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-1">
      <h3 className="text-sm font-semibold mb-2">Digest history</h3>
      {runs.map((run) => {
        const isExpanded = expanded === run.id;
        const duration   = run.completedAt
          ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
          : null;

        return (
          <div key={run.id} className="border border-border rounded-lg overflow-hidden">
            {/* Run header — click to expand */}
            <button
              onClick={() => setExpanded(isExpanded ? null : run.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-paper-sunken transition-colors text-left"
            >
              {/* Status badge */}
              <span className={cn(
                "text-2xs font-semibold px-2 py-0.5 rounded shrink-0",
                run.status === "done"    ? "bg-green-50 text-green-600" :
                run.status === "running" ? "bg-blue-50 text-blue-500"   :
                run.status === "failed"  ? "bg-red-50 text-red-500"     :
                                           "bg-paper-sunken text-ink-faint"
              )}>
                {run.status}
              </span>

              {/* Date + counts */}
              <span className="text-sm text-ink flex-1 truncate">
                {formatDate(run.startedAt)}
                <span className="text-ink-faint ml-2 text-xs">
                  {run.articlesNew} new · {run.articlesSeen} seen
                  {duration !== null ? ` · ${duration}s` : ""}
                </span>
              </span>

              {/* Expand chevron (only if logs available) */}
              {run.logs.length > 0 && (
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-ink-faint shrink-0 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
            </button>

            {/* Per-source log rows */}
            {isExpanded && run.logs.length > 0 && (
              <div className="border-t border-border">
                {run.logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "flex items-start gap-2.5 px-4 py-2.5 border-b border-border/50 last:border-0 text-xs",
                      log.status === "error" ? "bg-red-50/50" : ""
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {STATUS_ICON[log.status] ?? STATUS_ICON.skipped}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{log.sourceName}</span>
                        {log.status === "ok" && (
                          <span className="text-2xs text-ink-faint">
                            {log.itemsNew > 0 ? `+${log.itemsNew} new` : "no new articles"}
                            {log.durationMs ? ` · ${log.durationMs}ms` : ""}
                          </span>
                        )}
                      </div>
                      {log.error && (
                        <p className="text-2xs text-red-500 mt-0.5 line-clamp-2">{log.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
