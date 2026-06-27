"use client";
// hooks/use-articles.ts
// Central data hook for the dashboard article list.
// Handles fetching, pagination, filter changes, and optimistic updates.

import { useState, useEffect, useCallback, useRef } from "react";
import type { ArticleWithSource } from "@/types";

interface UseArticlesOptions {
  category:  string;   // "ALL" | Category enum value
  sourceId:  string | null;
  bookmarks: boolean;
}

interface ArticlesState {
  articles:   ArticleWithSource[];
  total:      number;
  totalPages: number;
  hasMore:    boolean;
  page:       number;
  loading:    boolean;
  loadingMore: boolean;
  error:      string | null;
}

export function useArticles(filters: UseArticlesOptions) {
  const [state, setState] = useState<ArticlesState>({
    articles:    [],
    total:       0,
    totalPages:  1,
    hasMore:     false,
    page:        1,
    loading:     true,
    loadingMore: false,
    error:       null,
  });

  // Track the current filter key so stale responses from previous filters are ignored
  const filterKey = `${filters.category}|${filters.sourceId ?? ""}|${filters.bookmarks}`;
  const filterKeyRef = useRef(filterKey);

  const fetchPage = useCallback(async (page: number, append = false) => {
    const currentKey = filterKey;
    filterKeyRef.current = currentKey;

    setState((prev) => ({
      ...prev,
      loading:     !append,
      loadingMore: append,
      error:       null,
      // Reset list when filter changes
      articles:    append ? prev.articles : [],
    }));

    const params = new URLSearchParams({
      page:     String(page),
      pageSize: "30",
    });
    if (filters.category !== "ALL") params.set("category", filters.category);
    if (filters.sourceId)           params.set("sourceId", filters.sourceId);
    if (filters.bookmarks)          params.set("bookmarks", "true");

    try {
      const res  = await fetch(`/api/articles?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Discard if a newer filter change has already fired
      if (filterKeyRef.current !== currentKey) return;

      setState((prev) => ({
        articles:    append ? [...prev.articles, ...data.articles] : data.articles,
        total:       data.total,
        totalPages:  data.totalPages,
        hasMore:     data.hasMore,
        page,
        loading:     false,
        loadingMore: false,
        error:       null,
      }));
    } catch (err) {
      if (filterKeyRef.current !== currentKey) return;
      setState((prev) => ({
        ...prev,
        loading:     false,
        loadingMore: false,
        error:       err instanceof Error ? err.message : "Failed to load articles",
      }));
    }
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch on filter change
  useEffect(() => {
    fetchPage(1, false);
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loadingMore) return;
    fetchPage(state.page + 1, true);
  }, [state.hasMore, state.loadingMore, state.page, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  // Optimistic bookmark toggle
  const toggleBookmark = useCallback((articleId: string, bookmarked: boolean) => {
    setState((prev) => ({
      ...prev,
      articles: prev.articles.map((a) =>
        a.id === articleId ? { ...a, isBookmarked: bookmarked } : a
      ),
    }));
  }, []);

  return { ...state, loadMore, refresh, toggleBookmark };
}
