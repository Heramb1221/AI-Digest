// components/dashboard/source-health-badge.tsx
// Small badge shown next to a source name indicating its health status.
// Used in the Sources settings page.

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Minus } from "lucide-react";

interface SourceHealthBadgeProps {
  consecutiveFails: number;
  isHealthy:        boolean;
  lastError?:       string | null;
}

export function SourceHealthBadge({
  consecutiveFails,
  isHealthy,
  lastError,
}: SourceHealthBadgeProps) {
  if (isHealthy && consecutiveFails === 0) {
    return (
      <span className="flex items-center gap-1 text-2xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
        <CheckCircle2 size={10} />
        OK
      </span>
    );
  }

  if (!isHealthy) {
    return (
      <span
        title={lastError ?? "Source is failing"}
        className="flex items-center gap-1 text-2xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded cursor-help"
      >
        <AlertCircle size={10} />
        Deactivated
      </span>
    );
  }

  // Degraded: some failures but not yet deactivated
  return (
    <span
      title={`${consecutiveFails} consecutive failure${consecutiveFails !== 1 ? "s" : ""}${lastError ? ": " + lastError : ""}`}
      className="flex items-center gap-1 text-2xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded cursor-help"
    >
      <AlertCircle size={10} />
      {consecutiveFails}× failing
    </span>
  );
}
