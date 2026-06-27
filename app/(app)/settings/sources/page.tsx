"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Rss, Youtube, MessageSquare, Globe, Trash2, Plus, RefreshCw } from "lucide-react";
import { Button }       from "@/components/ui/button";
import { Input }        from "@/components/ui/input";
import { useToast }     from "@/components/ui/toaster";
import { OPMLImport }   from "./opml-import";
import { DigestHistory } from "./digest-history";
import { SourceHealthBadge } from "@/components/dashboard/source-health-badge";
import { cn, getFaviconUrl, formatDate } from "@/lib/utils";
import type { SourceType } from "@prisma/client";

interface Source {
  id:          string;
  name:        string;
  url:         string;
  type:        SourceType;
  lastFetched: string | null;
  isActive:    boolean;
  faviconUrl:  string | null;
  health?: {
    consecutiveFails: number;
    isHealthy:        boolean;
    lastError:        string | null;
  } | null;
}

const TYPE_ICONS: Record<SourceType, React.ReactNode> = {
  RSS:     <Rss size={13} />,
  YOUTUBE: <Youtube size={13} />,
  REDDIT:  <MessageSquare size={13} />,
  EMAIL:   <MessageSquare size={13} />,
  SCRAPE:  <Globe size={13} />,
};

const SOURCE_TYPES: { type: SourceType; label: string; placeholder: string }[] = [
  { type: "RSS",     label: "RSS / Blog",      placeholder: "https://example.com/feed.xml" },
  { type: "YOUTUBE", label: "YouTube channel", placeholder: "https://youtube.com/@channel"  },
  { type: "REDDIT",  label: "Subreddit",       placeholder: "https://reddit.com/r/sub"      },
  { type: "SCRAPE",  label: "Webpage",         placeholder: "https://example.com"           },
];


export default function SourcesPage() {
  const { toast } = useToast();
  const [sources,    setSources]    = useState<Source[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addType,    setAddType]    = useState<SourceType>("RSS");
  const [addName,    setAddName]    = useState("");
  const [addUrl,     setAddUrl]     = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError,   setAddError]   = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/sources");
    const data = await res.json();
    setSources(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  async function handleRefreshSource(id: string, name: string) {
    setRefreshing(id);
    const res  = await fetch(`/api/sources/${id}/refresh`, { method: "POST" });
    const data = await res.json();
    setRefreshing(null);
    if (res.ok) {
      toast({
        title:       `"${name}" refreshed`,
        description: `${data.articlesNew} new article${data.articlesNew !== 1 ? "s" : ""}`,
        type:        "success",
      });
      loadSources();
    } else {
      toast({ title: data.error ?? "Refresh failed.", type: "error" });
    }
  }

  async function handleAdd() {
    setAddError(null);
    if (!addName.trim()) { setAddError("Name is required."); return; }
    if (!addUrl.trim())  { setAddError("URL is required.");  return; }

    setAddLoading(true);
    const res = await fetch("/api/sources", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: addType, name: addName.trim(), url: addUrl.trim() }),
    });
    setAddLoading(false);

    if (!res.ok) {
      const data = await res.json();
      if (data.upgrade) {
        toast({ title: "Source limit reached.", description: "Upgrade to Pro for 50 sources.", type: "error" });
      } else {
        setAddError(data.error ?? "Failed to add source.");
      }
      return;
    }

    toast({ title: `"${addName}" added.`, type: "success" });
    setAddName("");
    setAddUrl("");
    setShowAdd(false);
    loadSources();
  }

  async function handleDelete(id: string, name: string) {
    setDeleting(id);
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    setDeleting(null);
    toast({ title: `"${name}" removed.`, type: "default" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold mb-0.5">Sources</h2>
          <p className="text-sm text-ink-muted">
            {sources.length} active · free plan: 5 max
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={13} /> Add source
        </Button>
      </div>

      {/* OPML import widget */}
      <OPMLImport onImported={loadSources} />

      {/* Add form */}
      {showAdd && (
        <div className="border border-border rounded-xl p-4 bg-paper-raised flex flex-col gap-4">
          <h3 className="text-sm font-semibold">New source</h3>

          {/* Type picker */}
          <div className="flex flex-wrap gap-2">
            {SOURCE_TYPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => { setAddType(type); setAddError(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                  addType === type
                    ? "border-accent bg-accent-subtle text-accent"
                    : "border-border text-ink-muted hover:border-ink-faint"
                )}
              >
                {TYPE_ICONS[type]} {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name"
              placeholder="TechCrunch"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
            <Input
              label="URL"
              type="url"
              placeholder={SOURCE_TYPES.find((t) => t.type === addType)?.placeholder}
              value={addUrl}
              onChange={(e) => { setAddUrl(e.target.value); setAddError(null); }}
            />
          </div>

          {addError && (
            <p className="text-xs text-red-500">{addError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={addLoading} onClick={handleAdd}>
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Sources list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-paper-sunken rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-ink-muted">No sources yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-paper-raised hover:bg-paper-sunken transition-colors group"
            >
              {/* Favicon */}
              <img
                src={getFaviconUrl(source.url)}
                alt=""
                className="h-4 w-4 rounded object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{source.name}</p>
                  {source.health && (
                    <SourceHealthBadge
                      consecutiveFails={source.health.consecutiveFails}
                      isHealthy={source.health.isHealthy}
                      lastError={source.health.lastError}
                    />
                  )}
                </div>
                <p className="text-xs text-ink-faint truncate">{source.url}</p>
              </div>

              {/* Type badge */}
              <span className="flex items-center gap-1 text-2xs text-ink-faint bg-paper-sunken px-2 py-0.5 rounded shrink-0">
                {TYPE_ICONS[source.type]}
                {source.type}
              </span>

              {/* Last fetched */}
              {source.lastFetched && (
                <span className="text-2xs text-ink-faint shrink-0 hidden sm:block">
                  {formatDate(source.lastFetched)}
                </span>
              )}

              {/* Per-source refresh button */}
              <button
                onClick={() => handleRefreshSource(source.id, source.name)}
                disabled={refreshing === source.id}
                title="Refresh this source now"
                className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-accent transition-all shrink-0"
              >
                <RefreshCw
                  size={13}
                  className={refreshing === source.id ? "animate-spin" : ""}
                />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(source.id, source.name)}
                disabled={deleting === source.id}
                className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all ml-1 shrink-0"
              >
                {deleting === source.id
                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                  : <Trash2 size={14} />
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Digest run history with per-source logs */}
      <DigestHistory />
    </div>
  );
}
