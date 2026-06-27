// lib/fetchers/index.ts
// Single entry point for the digest runner.
// Maps SourceType → the correct fetcher function.

import type { SourceType } from "@prisma/client";
import type { FetchResult } from "./types";
import { fetchRSS }     from "./rss";
import { fetchYouTube } from "./youtube";
import { fetchReddit }  from "./reddit";
import { fetchScrape }  from "./scrape";

export type { FetchedItem, FetchResult } from "./types";

export async function fetchSource(type: SourceType, url: string): Promise<FetchResult> {
  switch (type) {
    case "RSS":     return fetchRSS(url);
    case "YOUTUBE": return fetchYouTube(url);
    case "REDDIT":  return fetchReddit(url);
    case "SCRAPE":  return fetchScrape(url);
    case "EMAIL":
      // Email ingestion requires a dedicated inbox / IMAP setup.
      // Returning empty with a clear message so the runner skips gracefully.
      return { items: [], error: "EMAIL source type not yet implemented" };
    default:
      return { items: [], error: `Unknown source type: ${type}` };
  }
}
