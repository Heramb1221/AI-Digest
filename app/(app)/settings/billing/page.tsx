"use client";

import React, { useState, useEffect } from "react";
import { Check, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

interface UserSettings { plan: string; }

const PLANS = [
  {
    id:    "FREE",
    name:  "Free",
    price: "$0",
    items: ["5 sources", "Daily digest", "AI summaries", "Auto-categorisation"],
    cta:   null,
  },
  {
    id:    "PRO",
    name:  "Pro",
    price: "$12/mo",
    items: ["50 sources", "Custom categories", "Bookmarks", "Chat with digest", "Daily email digest", "API access"],
    cta:   "Upgrade to Pro",
  },
  {
    id:    "TEAM",
    name:  "Team",
    price: "$29/mo",
    items: ["200 shared sources", "Hourly refresh", "Team workspace", "Everything in Pro", "Priority support"],
    cta:   "Upgrade to Team",
  },
];

export default function BillingPage() {
  const { toast } = useToast();
  const [settings,  setSettings]  = useState<UserSettings | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/settings").then((r) => r.json()).then(setSettings);
  }, []);

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    const res  = await fetch("/api/stripe/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: planId }),
    });
    const data = await res.json();
    setUpgrading(null);
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast({ title: "Could not open checkout.", type: "error" });
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    const res  = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setPortalLoading(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast({ title: "No billing account found.", type: "error" });
    }
  }

  const currentPlan = settings?.plan ?? "FREE";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Billing</h2>
        <p className="text-sm text-ink-muted">
          You're on the <span className="font-medium text-ink">{currentPlan}</span> plan.
        </p>
      </div>

      {/* Plan cards */}
      <div className="flex flex-col gap-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
                isCurrent ? "border-accent bg-accent-subtle" : "border-border bg-paper-raised"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  {isCurrent && (
                    <span className="text-2xs font-semibold uppercase tracking-wider text-accent bg-white px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-lg font-semibold mb-2">{plan.price}</p>
                <ul className="flex flex-col gap-1">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Check size={11} className="text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {plan.cta && !isCurrent && (
                <Button
                  size="sm"
                  loading={upgrading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                  className="shrink-0 self-start"
                >
                  <Zap size={12} /> {plan.cta}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Manage subscription */}
      {currentPlan !== "FREE" && (
        <div className="pt-2">
          <Button variant="outline" size="sm" loading={portalLoading} onClick={handlePortal}>
            <ExternalLink size={13} /> Manage subscription
          </Button>
          <p className="text-xs text-ink-faint mt-1.5">
            Cancel, change payment method, or view invoices on the Stripe billing portal.
          </p>
        </div>
      )}
    </div>
  );
}
