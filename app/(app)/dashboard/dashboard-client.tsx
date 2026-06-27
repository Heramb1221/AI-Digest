"use client";
// app/(app)/dashboard/dashboard-client.tsx
// The main interactive dashboard shell.
// Layout: [AppShell sidebar] | [Article list panel] | [Reader pane] | [Chat panel?]
//
// Responsive behaviour:
//   Desktop (≥1024px): list + reader always visible side by side
//   Mobile (<1024px):  list shown by default; reader slides in over it

import { useState, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { ArticleList }    from "@/components/dashboard/article-list";
import { ReaderPane }     from "@/components/dashboard/reader-pane";
import { DigestHeader }   from "@/components/dashboard/digest-header";
import { ChatPanel }      from "@/components/dashboard/chat-panel";
import { EmptyDigest }    from "@/components/dashboard/empty-digest";
import { UpgradeBanner }  from "@/components/dashboard/upgrade-banner";
import { SourceSidebar }  from "@/components/dashboard/source-sidebar";
import { useArticles }    from "@/hooks/use-articles";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcut";
import { cn }             from "@/lib/utils";
import type { ArticleWithSource } from "@/types";
import type { SourceType, Plan }  from "@prisma/client";

interface Source {
  id:         string;
  name:       string;
  url:        string;
  type:       SourceType;
  faviconUrl: string | null;
}

interface DashboardClientProps {
  sources:   Source[];
  plan:      Plan;
  userName:  string | null | undefined;
}

export function DashboardClient({ sources, plan, userName }: DashboardClientProps) {
  // ── Filter state ────────────────────────────────────────────────────────────
  const [activeCategory,  setActiveCategory]  = useState("ALL");
  const [activeSourceId,  setActiveSourceId]  = useState<string | null>(null);
  const [bookmarksActive, setBookmarksActive] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedArticle, setSelectedArticle] = useState<ArticleWithSource | null>(null);
  const [chatOpen,        setChatOpen]         = useState(false);
  const [showUpgrade,     setShowUpgrade]      = useState<string | null>(null);
  // Mobile: true = show reader, false = show list
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);

  const isPro = plan !== "FREE";

  // ── Articles data ────────────────────────────────────────────────────────────
  const {
    articles, total, hasMore, loading, loadingMore, error,
    loadMore, refresh, toggleBookmark,
  } = useArticles({
    category:  activeCategory,
    sourceId:  activeSourceId,
    bookmarks: bookmarksActive,
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelectArticle = useCallback((article: ArticleWithSource) => {
    setSelectedArticle(article);
    setMobileReaderOpen(true);
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    setBookmarksActive(false);
  }, []);

  const handleBookmarksToggle = useCallback(() => {
    if (!isPro) { setShowUpgrade("bookmarks"); return; }
    setBookmarksActive((b) => !b);
    setActiveCategory("ALL");
  }, [isPro]);

  const handleSourceSelect = useCallback((id: string | null) => {
    setActiveSourceId(id);
  }, []);

  const handleChatToggle = useCallback(() => {
    if (!isPro) { setShowUpgrade("chat"); return; }
    setChatOpen((o) => !o);
  }, [isPro]);

  const handleBookmarkChange = useCallback((id: string, bookmarked: boolean) => {
    toggleBookmark(id, bookmarked);
    // Keep selected article in sync
    setSelectedArticle((prev) =>
      prev?.id === id ? { ...prev, isBookmarked: bookmarked } : prev
    );
  }, [toggleBookmark]);

  // ── Keyboard shortcuts (j/k navigate, o open, r refresh) ────────────────────
  useKeyboardShortcuts([
    {
      key: "j",
      callback: () => {
        const idx  = articles.findIndex((a) => a.id === selectedArticle?.id);
        const next = articles[idx + 1];
        if (next) handleSelectArticle(next);
      },
    },
    {
      key: "k",
      callback: () => {
        const idx  = articles.findIndex((a) => a.id === selectedArticle?.id);
        const prev = articles[idx - 1];
        if (prev) handleSelectArticle(prev);
      },
    },
    {
      key: "o",
      callback: () => {
        if (selectedArticle) window.open(selectedArticle.url, "_blank", "noopener");
      },
      enabled: !!selectedArticle,
    },
  ]);

  // ── Empty state: no sources ──────────────────────────────────────────────────
  if (sources.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <DigestHeader onRefreshed={refresh} />
        <EmptyDigest />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Source filter sidebar (injected into app shell nav area) ─────────── */}
      {/* NOTE: SourceSidebar renders inside the AppShell's <nav> via a portal
           workaround isn't needed here — we inline it in the left panel header */}

      {/* ── Left panel: article list ─────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col w-full lg:w-[340px] xl:w-[380px] shrink-0",
        // Mobile: hide list when reader is open
        mobileReaderOpen ? "hidden lg:flex" : "flex"
      )}>
        {/* Digest header with refresh button */}
        <DigestHeader onRefreshed={refresh} />

        {/* Upgrade banner (dismissible) */}
        {showUpgrade && (
          <UpgradeBanner feature={showUpgrade} />
        )}

        {/* Source filter sidebar — collapsible section above article list */}
        {sources.length > 0 && (
          <div className="border-b border-border">
            <SourceSidebar
              sources={sources}
              activeSourceId={activeSourceId}
              onSelectSource={handleSourceSelect}
            />
          </div>
        )}

        {/* Article list with category filter tabs */}
        <div className="flex-1 overflow-hidden">
          <ArticleList
            articles={articles}
            activeId={selectedArticle?.id ?? null}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            error={error}
            total={total}
            activeCategory={activeCategory}
            bookmarksActive={bookmarksActive}
            plan={plan}
            onSelectArticle={handleSelectArticle}
            onCategory={handleCategoryChange}
            onBookmarks={handleBookmarksToggle}
            onLoadMore={loadMore}
          />
        </div>
      </div>

      {/* ── Right panel: reader pane ──────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        // Mobile: show only when article selected
        mobileReaderOpen ? "flex" : "hidden lg:flex"
      )}>
        {/* Chat toggle button — floats at top right of reader pane */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-border shrink-0 bg-paper-raised">
          <button
            onClick={handleChatToggle}
            title={isPro ? "Chat with digest" : "Pro feature: Chat with digest"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors",
              chatOpen
                ? "bg-accent text-white border-accent"
                : "border-border text-ink-muted hover:bg-paper-sunken hover:text-ink",
              !isPro && "opacity-50"
            )}
          >
            <MessageSquare size={12} />
            Ask AI
            {!isPro && <span className="text-2xs text-amber-400 ml-0.5">Pro</span>}
          </button>
        </div>

        {/* Split: reader + optional chat */}
        <div className="flex flex-1 overflow-hidden">
          {/* Reader */}
          <div className={cn(
            "flex-1 overflow-hidden",
            chatOpen ? "border-r border-border" : ""
          )}>
            <ReaderPane
              article={selectedArticle}
              plan={plan}
              onClose={mobileReaderOpen ? () => setMobileReaderOpen(false) : undefined}
              onBookmarkChange={handleBookmarkChange}
            />
          </div>

          {/* Chat panel — slides in on the right */}
          {chatOpen && (
            <div className="w-[300px] xl:w-[340px] shrink-0 overflow-hidden">
              <ChatPanel
                plan={plan}
                onClose={() => setChatOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
