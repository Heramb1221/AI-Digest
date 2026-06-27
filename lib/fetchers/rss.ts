// lib/fetchers/rss.ts
// Handles RSS 2.0, Atom 1.0, and RDF feeds via rss-parser.
// Returns up to MAX_ITEMS items, newest first.

import Parser from "rss-parser";
import type { FetchedItem, FetchResult } from "./types";

const MAX_ITEMS = 20;
const TIMEOUT_MS = 12_000;

// Single shared parser instance — rss-parser is stateless
const parser = new Parser({
  timeout: TIMEOUT_MS,
  headers: {
    "User-Agent": "AIDigest/1.0 (https://aigestapp.com; feed aggregator)",
    "Accept":     "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
  // Pull extra fields that some feeds put content in
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["description",     "description"   ],
      ["summary",         "summary"       ],
      ["media:description", "mediaDescription"],
    ],
  },
});

export async function fetchRSS(feedUrl: string): Promise<FetchResult> {
  let feed;
  try {
    feed = await parser.parseURL(feedUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { items: [], error: `RSS fetch failed for ${feedUrl}: ${msg}` };
  }

  const items: FetchedItem[] = feed.items
    .slice(0, MAX_ITEMS)
    .map((item) => {
      // Content priority: contentEncoded → content → contentSnippet → description → summary
      const raw =
        (item as any).contentEncoded ??
        item.content ??
        item.contentSnippet ??
        (item as any).description ??
        (item as any).summary ??
        (item as any).mediaDescription ??
        "";

      return {
        title:       stripHtml(item.title ?? "Untitled"),
        url:         item.link ?? item.guid ?? "",
        content:     stripHtml(raw).slice(0, 4000), // cap to avoid huge Gemini prompts
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      };
    })
    // Drop items with no usable URL
    .filter((i) => i.url.startsWith("http"));

  return { items };
}

// ─── Validate that a URL is a real RSS/Atom feed (used in POST /api/sources) ─

export async function validateRSSFeed(url: string): Promise<{ valid: boolean; title?: string; error?: string }> {
  try {
    const feed = await parser.parseURL(url);
    return { valid: true, title: feed.title };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid feed" };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and collapse whitespace.
 * Keeps the text content of the markup — safe for Gemini prompts.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g,  " ")
    .replace(/&amp;/g,   "&")
    .replace(/&lt;/g,    "<")
    .replace(/&gt;/g,    ">")
    .replace(/&quot;/g,  '"')
    .replace(/&#39;/g,   "'")
    .replace(/\s+/g,     " ")
    .trim();
}
