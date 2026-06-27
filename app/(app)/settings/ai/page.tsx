"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

export default function AISettingsPage() {
  const { toast }   = useToast();
  const [hasKey,    setHasKey]    = useState(false);
  const [key,       setKey]       = useState("");
  const [showKey,   setShowKey]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasGeminiKey ?? false);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!key.trim()) { toast({ title: "Enter a key first.", type: "error" }); return; }
    setSaving(true);
    const res = await fetch("/api/user/settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ geminiApiKey: key.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setHasKey(true);
      setKey("");
      toast({ title: "API key saved.", type: "success" });
    } else {
      toast({ title: "Failed to save key.", type: "error" });
    }
  }

  async function handleRemove() {
    setRemoving(true);
    await fetch("/api/user/settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ geminiApiKey: null }),
    });
    setRemoving(false);
    setHasKey(false);
    toast({ title: "API key removed.", type: "default" });
  }

  if (loading) return <div className="h-32 bg-paper-sunken rounded-lg animate-pulse" />;

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <h2 className="text-base font-semibold mb-0.5">AI & API key</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          AI Digest uses Google Gemini 2.0 Flash to summarise articles.
          By default it uses the platform key (shared quota). Add your own key for dedicated quota.
        </p>
      </div>

      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-4 self-start"
      >
        Get a free Gemini API key <ExternalLink size={12} />
      </a>

      {hasKey ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            <span>✓</span>
            <span>Your Gemini API key is active.</span>
          </div>
          <Button variant="outline" size="sm" loading={removing} onClick={handleRemove} className="self-start text-red-500 border-red-200 hover:bg-red-50">
            Remove key
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Input
              label="Gemini API key"
              type={showKey ? "text" : "password"}
              placeholder="AIza..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-7 text-ink-faint hover:text-ink"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-xs text-ink-faint">
            Keys are AES-256 encrypted in the database and never returned in API responses.
          </p>
          <Button onClick={handleSave} loading={saving} className="self-start">
            Save key
          </Button>
        </div>
      )}
    </div>
  );
}
