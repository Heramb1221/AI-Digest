"use client";
// components/dashboard/filter-bar.tsx
// Horizontal tab strip for filtering articles by category or source.
// Sits above the article list in the left panel.

import { cn, CATEGORY_META } from "@/lib/utils";
import { Bookmark } from "lucide-react";
import type { Plan } from "@prisma/client";

const CATEGORIES = [
  "ALL",
  "TECHNICAL",
  "BUSINESS",
  "TRENDS",
  "TOOLS",
  "NEWS",
  "UNCATEGORISED",
] as const;

interface FilterBarProps {
  activeCategory:  string;
  bookmarksActive: boolean;
  plan:            Plan;
  onCategory:      (cat: string) => void;
  onBookmarks:     () => void;
}

export function FilterBar({
  activeCategory,
  bookmarksActive,
  plan,
  onCategory,
  onBookmarks,
}: FilterBarProps) {
  const isPro = plan !== "FREE";

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto shrink-0 scrollbar-none">
      {CATEGORIES.map((cat) => {
        const isAll    = cat === "ALL";
        const isActive = !bookmarksActive && activeCategory === cat;
        const label    = isAll ? "All" : (CATEGORY_META[cat]?.label ?? cat);

        return (
          <button
            key={cat}
            onClick={() => onCategory(cat)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              isActive
                ? "bg-ink text-paper"
                : "text-ink-muted hover:text-ink hover:bg-paper-sunken"
            )}
          >
            {label}
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-4 bg-border mx-1 shrink-0" />

      {/* Bookmarks — Pro only */}
      <button
        onClick={isPro ? onBookmarks : undefined}
        title={isPro ? "Saved articles" : "Upgrade to Pro for bookmarks"}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
          !isPro && "opacity-40 cursor-not-allowed",
          bookmarksActive
            ? "bg-ink text-paper"
            : "text-ink-muted hover:text-ink hover:bg-paper-sunken"
        )}
      >
        <Bookmark size={11} />
        Saved
      </button>
    </div>
  );
}
