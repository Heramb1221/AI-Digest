"use client";
// components/dashboard/upgrade-banner.tsx
// Shown when a free user tries to use a Pro feature.
// Dismissible, links to billing.

import { useState } from "react";
import { Zap, X } from "lucide-react";
import Link from "next/link";

interface UpgradeBannerProps {
  feature: string; // e.g. "bookmarks", "chat"
}

export function UpgradeBanner({ feature }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs">
      <Zap size={12} className="text-amber-500 shrink-0" />
      <span className="text-amber-800 flex-1">
        <span className="font-medium capitalize">{feature}</span> is a Pro feature.{" "}
        <Link
          href="/settings/billing"
          className="underline underline-offset-2 hover:text-amber-900"
        >
          Upgrade for $12/mo
        </Link>{" "}
        to unlock it.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
