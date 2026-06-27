// types/index.ts
// Shared TypeScript types used across the frontend and API layer.

import type { Plan, Category, SourceType, Source, DigestRun } from "@prisma/client";

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ArticleWithSource {
  id:           string;
  title:        string;
  url:          string;
  summary:      string | null;
  content?:     string | null;
  category:     Category;
  importance:   number;
  publishedAt:  string | null;
  fetchedAt:    string;
  isBookmarked: boolean;
  source: {
    name:       string;
    type:       SourceType;
    faviconUrl: string | null;
  };
}

export interface ArticlesResponse {
  articles:  ArticleWithSource[];
  total:     number;
  page:      number;
  pageSize:  number;
}

export interface SourceWithCount extends Source {
  _count?: { articles: number };
}

export interface DigestStatus {
  lastRun:    DigestRun | null;
  isRunning:  boolean;
  nextRunAt:  string; // ISO string, always 06:00 UTC next day
}

export interface ReferralStats {
  referralCode:  string;
  referralUrl:   string;
  totalReferred: number;
  totalMonths:   number;
  rewards: {
    id:        string;
    refereeId: string;
    months:    number;
    awardedAt: string;
  }[];
}

export interface UserSettings {
  id:                  string;
  name:                string | null;
  email:               string;
  plan:                Plan;
  digestEmailEnabled:  boolean;
  hasGeminiKey:        boolean; // never return the actual key
  referralCode:        string;
}

// ─── UI state types ───────────────────────────────────────────────────────────

export type CategoryFilter = Category | "ALL";

export interface ActiveFilters {
  category: CategoryFilter;
  sourceId: string | null;
  bookmarks: boolean;
  page: number;
}

// ─── Re-exports for convenience ───────────────────────────────────────────────

export type { Plan, Category, SourceType };
