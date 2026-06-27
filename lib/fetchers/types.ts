// lib/fetchers/types.ts
// Every fetcher returns the same shape — the digest runner doesn't
// care which adapter produced an item.

export interface FetchedItem {
  title:       string;
  url:         string;
  content:     string;   // raw text used for AI summarisation
  publishedAt: Date | null;
}

export interface FetchResult {
  items:  FetchedItem[];
  error?: string;        // non-fatal — runner logs but continues
}
