"use client";
// components/dashboard/article-list.tsx
// Left panel: scrollable list of article rows, grouped by date section dividers.
// Handles empty/loading/error states and infinite-scroll "Load more".

import { useRef, useEffect } from "react";
import { ArticleRow }    from "./article-row";
import { FilterBar }     from "./filter-bar";
import { formatDate }    from "@/lib/utils";
import type { ArticleWithSource } from "@/types";
import type { Plan } from "@prisma/client";

interface ArticleListProps {
  articles:        ArticleWithSource[];
  activeId:        string | null;
  loading:         boolean;
  loadingMore:     boolean;
  hasMore:         boolean;
  error:           string | null;
  total:           number;
  activeCategory:  string;
  bookmarksActive: boolean;
  plan:            Plan;
  onSelectArticle: (article: ArticleWithSource) => void;
  onCategory:      (cat: string) => void;
  onBookmarks:     () => void;
  onLoadMore:      () => void;
}

// ── Group articles by date section ────────────────────────────────────────────

function groupByDate(articles: ArticleWithSource[]) {
  const groups = new Map<string, ArticleWithSource[]>();
  for (const a of articles) {
    const label = formatDate(a.publishedAt ?? a.fetchedAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(a);
  }
  return groups;
}

export function ArticleList({
  articles,
  activeId,
  loading,
  loadingMore,
  hasMore,
  error,
  total,
  activeCategory,
  bookmarksActive,
  plan,
  onSelectArticle,
  onCategory,
  onBookmarks,
  onLoadMore,
}: ArticleListProps) {
  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  const grouped = groupByDate(articles);

  return (
    <div className="flex flex-col h-full overflow-hidden border-r border-border">
      {/* Filter tabs */}
      <FilterBar
        activeCategory={activeCategory}
        bookmarksActive={bookmarksActive}
        plan={plan}
        onCategory={onCategory}
        onBookmarks={onBookmarks}
      />

      {/* Count bar */}
      <div className="px-4 py-1.5 border-b border-border shrink-0">
        <span className="text-2xs text-ink-faint">
          {loading ? "Loading…" : `${total.toLocaleString()} article${total === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3 border-b border-border/50">
                <div className="h-2 w-2 rounded-full bg-paper-sunken mt-1.5 shrink-0 animate-pulse" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-2.5 w-24 bg-paper-sunken rounded animate-pulse" />
                  <div className="h-3.5 w-full bg-paper-sunken rounded animate-pulse" />
                  <div className="h-3.5 w-3/4 bg-paper-sunken rounded animate-pulse" />
                  <div className="h-4 w-16 bg-paper-sunken rounded animate-pulse mt-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-red-500 text-center px-4">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-paper-sunken flex items-center justify-center mb-3">
              <span className="text-xl">📭</span>
            </div>
            <p className="text-sm font-medium text-ink mb-1">
              {bookmarksActive ? "No saved articles" : "No articles yet"}
            </p>
            <p className="text-xs text-ink-faint leading-relaxed">
              {bookmarksActive
                ? "Bookmark articles while reading to save them here."
                : "Run a digest refresh to fetch your latest articles."}
            </p>
          </div>
        )}

        {/* Article rows grouped by date */}
        {!loading && !error && articles.length > 0 && (
          <>
            {[...grouped.entries()].map(([dateLabel, group]) => (
              <div key={dateLabel}>
                {/* Date section divider */}
                <div className="section-divider">{dateLabel}</div>
                {group.map((article) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    isActive={article.id === activeId}
                    onClick={() => onSelectArticle(article)}
                  />
                ))}
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Load more spinner */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <span className="h-4 w-4 rounded-full border-2 border-border border-t-accent animate-spin" />
              </div>
            )}

            {/* End of list */}
            {!hasMore && articles.length > 0 && (
              <p className="text-center text-2xs text-ink-faint py-4">
                All caught up ✦
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
