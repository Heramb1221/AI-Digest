"use client";
// components/dashboard/reader-pane.tsx
// Right panel — shows the selected article's summary, metadata, and action bar.
// Marks the article as seen on mount. Handles bookmark toggle and regen.

import { useEffect, useState, useCallback } from "react";
import {
  ExternalLink, Bookmark, BookmarkCheck,
  RefreshCw, Zap, X, ChevronRight,
} from "lucide-react";
import { CategoryBadge }  from "./category-badge";
import { ImportanceDot }  from "./importance-dot";
import { cn, formatDate, getFaviconUrl } from "@/lib/utils";
import type { ArticleWithSource } from "@/types";
import type { Plan } from "@prisma/client";

interface ReaderPaneProps {
  article:         ArticleWithSource | null;
  plan:            Plan;
  onClose?:        () => void;               // mobile: dismiss reader
  onBookmarkChange: (id: string, bookmarked: boolean) => void;
}

export function ReaderPane({
  article,
  plan,
  onClose,
  onBookmarkChange,
}: ReaderPaneProps) {
  const [bookmarked,   setBookmarked]   = useState(false);
  const [summary,      setSummary]      = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError,   setRegenError]   = useState<string | null>(null);
  const isPro = plan !== "FREE";

  // Sync local state when article changes
  useEffect(() => {
    if (!article) return;
    setBookmarked(article.isBookmarked ?? false);
    setSummary(article.summary ?? null);
    setRegenError(null);

    // Mark as seen (fire-and-forget)
    fetch(`/api/articles/${article.id}/seen`, { method: "POST" }).catch(() => {});
  }, [article?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBookmark = useCallback(async () => {
    if (!article || !isPro) return;
    const next = !bookmarked;
    setBookmarked(next);
    onBookmarkChange(article.id, next);

    const res = await fetch(`/api/articles/${article.id}/bookmark`, { method: "POST" });
    if (!res.ok) {
      // Revert optimistic update
      setBookmarked(!next);
      onBookmarkChange(article.id, !next);
    }
  }, [article, bookmarked, isPro, onBookmarkChange]);

  const handleRegenerate = useCallback(async () => {
    if (!article || !isPro || regenerating) return;
    setRegenerating(true);
    setRegenError(null);

    const res  = await fetch(`/api/ai/regenerate/${article.id}`, { method: "POST" });
    const data = await res.json();
    setRegenerating(false);

    if (res.ok) {
      setSummary(data.summary ?? null);
    } else {
      setRegenError(data.error ?? "Regeneration failed.");
    }
  }, [article, isPro, regenerating]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="h-16 w-16 rounded-full bg-paper-sunken flex items-center justify-center mb-4">
          <span className="text-2xl">📰</span>
        </div>
        <p className="text-sm font-medium text-ink mb-1">Select an article</p>
        <p className="text-xs text-ink-faint leading-relaxed max-w-xs">
          Choose an article from the list to read its AI summary and open the original.
        </p>
      </div>
    );
  }

  const favicon = article.source.faviconUrl ?? getFaviconUrl(article.url);
  const date    = article.publishedAt ?? article.fetchedAt;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-paper-raised">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          {/* Source + date */}
          <div className="flex items-center gap-2 mb-2">
            <img
              src={favicon}
              alt=""
              className="h-4 w-4 rounded-sm object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-xs text-ink-faint font-medium">{article.source.name}</span>
            <span className="text-xs text-ink-faint">·</span>
            <span className="text-xs text-ink-faint">{formatDate(date)}</span>
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold leading-snug text-ink text-balance">
            {article.title}
          </h2>

          {/* Category + importance */}
          <div className="flex items-center gap-2 mt-2.5">
            <CategoryBadge category={article.category} />
            <div className="flex items-center gap-1">
              <ImportanceDot importance={article.importance} />
              <span className="text-2xs text-ink-faint">
                {["", "Low signal", "Minor update", "Worth knowing", "Very relevant", "Must read"][article.importance]}
              </span>
            </div>
          </div>
        </div>

        {/* Close button (mobile) */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink transition-colors shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5">

        {/* AI Summary section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">
              AI Summary
            </p>
            {/* Regen button — Pro only */}
            <button
              onClick={isPro ? handleRegenerate : undefined}
              disabled={regenerating}
              title={isPro ? "Regenerate summary" : "Requires Pro plan"}
              className={cn(
                "flex items-center gap-1 text-2xs font-medium transition-colors",
                isPro
                  ? "text-ink-faint hover:text-ink"
                  : "text-ink-faint/40 cursor-not-allowed"
              )}
            >
              <RefreshCw
                size={11}
                className={regenerating ? "animate-spin" : ""}
              />
              {regenerating ? "Regenerating…" : "Regenerate"}
              {!isPro && <Zap size={10} className="text-amber-400 ml-0.5" />}
            </button>
          </div>

          {regenError && (
            <p className="text-xs text-red-500 mb-2">{regenError}</p>
          )}

          {summary ? (
            <p className="text-sm leading-relaxed text-ink">
              {summary}
            </p>
          ) : (
            <p className="text-sm text-ink-faint italic">
              No summary available for this article.
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-6" />

        {/* Original article link */}
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint mb-2">
            Original article
          </p>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex items-start gap-2 text-sm text-accent hover:underline underline-offset-4 break-all"
          >
            <ExternalLink size={13} className="shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="line-clamp-2">{article.url}</span>
          </a>
        </div>

      </div>

      {/* ── Action bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          title={
            !isPro ? "Upgrade to Pro to bookmark articles"
            : bookmarked ? "Remove bookmark"
            : "Save article"
          }
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition-colors",
            !isPro
              ? "text-ink-faint/40 cursor-not-allowed"
              : bookmarked
                ? "text-accent"
                : "text-ink-muted hover:text-ink"
          )}
        >
          {bookmarked
            ? <BookmarkCheck size={14} />
            : <Bookmark size={14} />
          }
          {bookmarked ? "Saved" : "Save"}
          {!isPro && <Zap size={10} className="text-amber-400 ml-0.5" />}
        </button>

        {/* Open original */}
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
        >
          Read original <ChevronRight size={13} />
        </a>
      </div>
    </div>
  );
}
