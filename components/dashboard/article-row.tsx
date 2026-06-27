"use client";
// components/dashboard/article-row.tsx
// One row in the article list panel.
// Shows importance dot, source favicon, title, source name, date, category badge.
// Highlights when it's the active (open) article.

import { cn, formatDate, getFaviconUrl, CATEGORY_META } from "@/lib/utils";
import { ImportanceDot } from "./importance-dot";
import type { ArticleWithSource } from "@/types";

interface ArticleRowProps {
  article:  ArticleWithSource;
  isActive: boolean;
  onClick:  () => void;
}

export function ArticleRow({ article, isActive, onClick }: ArticleRowProps) {
  const favicon  = article.source.faviconUrl ?? getFaviconUrl(article.url);
  const catMeta  = CATEGORY_META[article.category] ?? CATEGORY_META.UNCATEGORISED;
  const date     = article.publishedAt ?? article.fetchedAt;

  return (
    <button
      onClick={onClick}
      className={cn(
        "article-row w-full text-left",
        isActive && "active"
      )}
    >
      {/* Importance dot — left gutter */}
      <ImportanceDot importance={article.importance} className="mt-1 shrink-0" />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Source line */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <img
            src={favicon}
            alt=""
            className="h-3.5 w-3.5 rounded-sm object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-2xs text-ink-faint truncate">{article.source.name}</span>
          <span className="text-2xs text-ink-faint">·</span>
          <span className="text-2xs text-ink-faint shrink-0">{formatDate(date)}</span>
        </div>

        {/* Title */}
        <p className={cn(
          "text-sm leading-snug line-clamp-2",
          isActive ? "font-semibold text-ink" : "font-medium text-ink"
        )}>
          {article.title}
        </p>

        {/* Category badge */}
        <div className="mt-1.5">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium",
            catMeta.bg,
            catMeta.color
          )}>
            {catMeta.label}
          </span>
        </div>
      </div>
    </button>
  );
}
