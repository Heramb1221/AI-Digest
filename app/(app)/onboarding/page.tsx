"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Rss, Youtube, MessageSquare, Globe, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SourceType = "RSS" | "YOUTUBE" | "REDDIT" | "SCRAPE";

interface SourceOption {
  type:        SourceType;
  label:       string;
  icon:        React.ReactNode;
  placeholder: string;
  example:     string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    type:        "RSS",
    label:       "RSS / Blog",
    icon:        <Rss size={16} />,
    placeholder: "https://example.com/feed.xml",
    example:     "e.g. https://feeds.feedburner.com/TechCrunch",
  },
  {
    type:        "YOUTUBE",
    label:       "YouTube Channel",
    icon:        <Youtube size={16} />,
    placeholder: "https://youtube.com/@channelname",
    example:     "e.g. https://youtube.com/@ThePrimeagen",
  },
  {
    type:        "REDDIT",
    label:       "Subreddit",
    icon:        <MessageSquare size={16} />,
    placeholder: "https://reddit.com/r/programming",
    example:     "e.g. https://reddit.com/r/MachineLearning",
  },
  {
    type:        "SCRAPE",
    label:       "Any webpage",
    icon:        <Globe size={16} />,
    placeholder: "https://news.ycombinator.com",
    example:     "e.g. https://news.ycombinator.com",
  },
];

const STEPS = ["Welcome", "Add a source", "You're set"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step,       setStep]       = useState(0);
  const [sourceType, setSourceType] = useState<SourceType>("RSS");
  const [name,       setName]       = useState("");
  const [url,        setUrl]        = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [skipped,    setSkipped]    = useState(false);

  const selected = SOURCE_OPTIONS.find((o) => o.type === sourceType)!;

  async function handleAddSource() {
    setError(null);
    if (!url.trim()) { setError("Please enter a URL."); return; }
    if (!name.trim()) { setError("Please give this source a name."); return; }

    setLoading(true);
    const res = await fetch("/api/sources", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: sourceType, name: name.trim(), url: url.trim() }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not add source. Check the URL and try again.");
      return;
    }
    setStep(2);
  }

  function handleSkip() {
    setSkipped(true);
    setStep(2);
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  i < step  ? "bg-accent text-white"        :
                  i === step ? "bg-accent text-white"       :
                              "bg-paper-sunken text-ink-faint"
                )}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                i === step ? "text-ink" : "text-ink-faint"
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-8 h-px", i < step ? "bg-accent" : "bg-border")} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="w-full max-w-md">

        {/* ── Step 0: Welcome ─────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-6 text-center">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Welcome to AI Digest</h1>
              <p className="text-sm text-ink-muted leading-relaxed">
                Add your favourite RSS feeds, YouTube channels, subreddits, or any webpage.
                Every morning, AI summarises what's new and delivers a clean digest — just for you.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { icon: "✦", title: "AI summaries",        body: "2–3 sentence briefs, auto-generated." },
                { icon: "◎", title: "Zero duplicates",     body: "Articles you've seen are never shown again." },
                { icon: "⊞", title: "Grouped by topic",    body: "Technical, Business, Trends, Tools, News." },
                { icon: "⚡", title: "Bring your own key", body: "Use your Gemini API key to avoid limits." },
              ].map((f) => (
                <div key={f.title} className="bg-paper-raised border border-border rounded-lg p-3">
                  <p className="text-base mb-1">{f.icon}</p>
                  <p className="text-xs font-semibold mb-0.5">{f.title}</p>
                  <p className="text-xs text-ink-muted">{f.body}</p>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(1)}>
              Let's add your first source <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* ── Step 1: Add source ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-semibold mb-1">Add your first source</h2>
              <p className="text-sm text-ink-muted">
                You can add up to 5 sources on the free plan. Add more later from Settings.
              </p>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => { setSourceType(opt.type); setUrl(""); setError(null); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                    sourceType === opt.type
                      ? "border-accent bg-accent-subtle text-accent"
                      : "border-border bg-paper-raised text-ink-muted hover:border-ink-faint"
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3">
              <Input
                label="Name"
                placeholder="e.g. TechCrunch"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  label="URL"
                  type="url"
                  placeholder={selected.placeholder}
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(null); }}
                />
                <p className="text-xs text-ink-faint">{selected.example}</p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={handleSkip}
                disabled={loading}
              >
                Skip for now
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddSource}
                loading={loading}
              >
                Add source
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Done ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
              <Check size={28} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {skipped ? "You're all set!" : "Source added!"}
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                {skipped
                  ? "Head to Settings → Sources whenever you're ready to add your feeds. Your first AI digest runs at 06:00 UTC."
                  : "Your first digest will run tonight at 06:00 UTC. You can also trigger a manual refresh from your dashboard anytime."}
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              Go to dashboard <ArrowRight size={14} />
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
