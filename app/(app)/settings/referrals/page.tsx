"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import type { ReferralStats } from "@/types";

export default function ReferralsPage() {
  const { toast }   = useToast();
  const [stats,     setStats]   = useState<ReferralStats | null>(null);
  const [copied,    setCopied]  = useState(false);

  useEffect(() => {
    fetch("/api/referral/stats").then((r) => r.json()).then(setStats);
  }, []);

  function handleCopy() {
    if (!stats?.referralUrl) return;
    navigator.clipboard.writeText(stats.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied!", type: "success" });
  }

  if (!stats) return <div className="h-40 bg-paper-sunken rounded-lg animate-pulse" />;

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Referrals</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          Share your link. When a friend upgrades to Pro, you both get one free month.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-xl p-4 text-center bg-paper-raised">
          <p className="text-2xl font-semibold">{stats.totalReferred}</p>
          <p className="text-xs text-ink-muted mt-0.5">friends referred</p>
        </div>
        <div className="border border-border rounded-xl p-4 text-center bg-paper-raised">
          <p className="text-2xl font-semibold">{stats.totalMonths}</p>
          <p className="text-xs text-ink-muted mt-0.5">free months earned</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-ink-muted">Your referral link</p>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-paper-raised">
          <span className="flex-1 text-sm text-ink-muted truncate">
            {stats.referralUrl}
          </span>
          <button
            onClick={handleCopy}
            className="text-ink-faint hover:text-ink transition-colors"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Reward history */}
      {stats.rewards.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-ink-muted">Reward history</p>
          <div className="flex flex-col gap-1">
            {stats.rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm px-3 py-2 bg-paper-raised border border-border rounded-lg">
                <div className="flex items-center gap-2 text-ink-muted">
                  <Gift size={13} />
                  <span>Friend upgraded</span>
                </div>
                <span className="text-green-600 font-medium text-xs">+{r.months} month</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
