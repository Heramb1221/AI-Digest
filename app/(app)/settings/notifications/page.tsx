"use client";

import React, { useState, useEffect } from "react";
import * as Switch from "@radix-ui/react-switch";
import { Button }   from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { cn }       from "@/lib/utils";

export default function NotificationsPage() {
  const { toast }   = useToast();
  const [enabled,   setEnabled]  = useState(false);
  const [plan,      setPlan]     = useState("FREE");
  const [loading,   setLoading]  = useState(true);
  const [saving,    setSaving]   = useState(false);

  useEffect(() => {
    fetch("/api/user/settings").then((r) => r.json()).then((data) => {
      setEnabled(data.digestEmailEnabled ?? false);
      setPlan(data.plan);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/user/settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ digestEmailEnabled: enabled }),
    });
    setSaving(false);
    toast({ title: "Preferences saved.", type: "success" });
  }

  const isPro = plan !== "FREE";

  if (loading) return <div className="h-32 bg-paper-sunken rounded-lg animate-pulse" />;

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Notifications</h2>
        <p className="text-sm text-ink-muted">Control how AI Digest contacts you.</p>
      </div>

      {/* Email digest toggle */}
      <div className={cn(
        "flex items-start justify-between gap-4 border rounded-xl p-4",
        isPro ? "border-border bg-paper-raised" : "border-border bg-paper-sunken opacity-60"
      )}>
        <div>
          <p className="text-sm font-medium">Daily email digest</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Receive your morning digest by email at 06:00 UTC.
            {!isPro && " Requires Pro plan."}
          </p>
        </div>
        <Switch.Root
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={!isPro}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
            enabled && isPro ? "bg-accent" : "bg-border",
            !isPro && "cursor-not-allowed"
          )}
        >
          <Switch.Thumb className="block h-4 w-4 rounded-full bg-white shadow translate-x-0.5 transition-transform data-[state=checked]:translate-x-4" />
        </Switch.Root>
      </div>

      {!isPro && (
        <p className="text-xs text-ink-faint">
          Email digest is a Pro feature.{" "}
          <a href="/settings/billing" className="text-accent underline underline-offset-2">
            Upgrade
          </a>{" "}
          to unlock.
        </p>
      )}

      <Button onClick={handleSave} loading={saving} disabled={!isPro} className="self-start">
        Save preferences
      </Button>
    </div>
  );
}
