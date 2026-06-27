"use client";
// components/dashboard/source-sidebar.tsx
// Collapsible source list below the main nav items in the app shell.
// Clicking a source filters the article list to that source only.

import { useState } from "react";
import { ChevronRight, Rss, Youtube, MessageSquare, Globe } from "lucide-react";
import { cn, getFaviconUrl } from "@/lib/utils";
import type { SourceType } from "@prisma/client";

interface Source {
  id:         string;
  name:       string;
  url:        string;
  type:       SourceType;
  faviconUrl: string | null;
}

interface SourceSidebarProps {
  sources:        Source[];
  activeSourceId: string | null;
  onSelectSource: (id: string | null) => void;
}

const TYPE_ICON: Record<SourceType, React.ReactNode> = {
  RSS:     <Rss size={11} />,
  YOUTUBE: <Youtube size={11} />,
  REDDIT:  <MessageSquare size={11} />,
  EMAIL:   <MessageSquare size={11} />,
  SCRAPE:  <Globe size={11} />,
};

export function SourceSidebar({
  sources,
  activeSourceId,
  onSelectSource,
}: SourceSidebarProps) {
  const [open, setOpen] = useState(true);

  if (sources.length === 0) return null;

  return (
    <div className="border-t border-border pt-1 mt-1">
      {/* Section header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full px-3 py-1.5 text-2xs font-semibold uppercase tracking-widest text-ink-faint hover:text-ink transition-colors"
      >
        <ChevronRight
          size={11}
          className={cn("transition-transform", open && "rotate-90")}
        />
        Sources
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 pb-1">
          {/* "All sources" reset */}
          <button
            onClick={() => onSelectSource(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors mx-1",
              activeSourceId === null
                ? "bg-accent-subtle text-accent font-medium"
                : "text-ink-muted hover:bg-paper-sunken hover:text-ink"
            )}
          >
            All sources
          </button>

          {sources.map((source) => {
            const favicon   = source.faviconUrl ?? getFaviconUrl(source.url);
            const isActive  = source.id === activeSourceId;
            return (
              <button
                key={source.id}
                onClick={() => onSelectSource(isActive ? null : source.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors mx-1",
                  isActive
                    ? "bg-accent-subtle text-accent font-medium"
                    : "text-ink-muted hover:bg-paper-sunken hover:text-ink"
                )}
              >
                <img
                  src={favicon}
                  alt=""
                  className="h-3.5 w-3.5 rounded-sm object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="truncate">{source.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
