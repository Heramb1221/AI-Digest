// lib/fetchers/scrape.ts
// Generic webpage scraper — last resort for sites without RSS.
// Uses Cheerio to extract article links from common CMS patterns.
//
// Strategy (tried in order):
//   1. Look for <article> / .post / .entry elements with headings + links
//   2. Look for common news-site list patterns (<li> with <a> + <time>)
//   3. OG tags — treats the page itself as a single article
//
// This is intentionally heuristic. Real-world websites are messy.
// The output quality is lower than RSS/YouTube/Reddit — users are informed.

import * as cheerio from "cheerio";
import type { FetchedItem, FetchResult } from "./types";

const MAX_ITEMS  = 12;
const TIMEOUT_MS = 15_000;

export async function fetchScrape(pageUrl: string): Promise<FetchResult> {
  let html: string;
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "AIDigest/1.0 (https://aigestapp.com; like Googlebot)",
        "Accept":     "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      return { items: [], error: `Scrape got HTTP ${res.status} from ${pageUrl}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return { items: [], error: `${pageUrl} returned non-HTML content: ${contentType}` };
    }

    html = await res.text();
  } catch (err) {
    return { items: [], error: `Scrape fetch failed for ${pageUrl}: ${err}` };
  }

  const $ = cheerio.load(html);
  const baseOrigin = new URL(pageUrl).origin;

  // ── Strategy 1: Article / post elements ───────────────────────────────────
  const items: FetchedItem[] = [];

  const ARTICLE_SELECTORS = [
    "article",
    ".post", ".entry", ".card",
    "[class*='article']", "[class*='post-item']",
    "main li",   // HN-style lists
  ];

  for (const sel of ARTICLE_SELECTORS) {
    $(sel).each((_, el) => {
      if (items.length >= MAX_ITEMS) return false; // break

      const heading = $(el).find("h1, h2, h3, h4").first();
      const link    = heading.find("a").first().attr("href")
                   || $(el).find("a").first().attr("href");

      if (!link) return;

      const resolvedUrl = resolveUrl(link, baseOrigin);
      if (!resolvedUrl) return;

      const title   = cleanText(heading.text() || $(el).find("a").first().text());
      if (!title || title.length < 5) return;

      const excerpt = cleanText(
        $(el).find("p, .excerpt, .description, [class*='summary']").first().text()
      );

      const dateEl  = $(el).find("time, .date, [class*='date'], [datetime]").first();
      const dateStr = dateEl.attr("datetime") || dateEl.text();
      const publishedAt = dateStr ? parseDate(dateStr) : null;

      // Avoid duplicates within this batch
      if (!items.find((i) => i.url === resolvedUrl)) {
        items.push({ title, url: resolvedUrl, content: excerpt, publishedAt });
      }
    });

    if (items.length >= 3) break; // found enough via this selector
  }

  // ── Strategy 2: <a> tags that look like article links ─────────────────────
  if (items.length < 3) {
    $("a[href]").each((_, el) => {
      if (items.length >= MAX_ITEMS) return false;

      const href  = $(el).attr("href") ?? "";
      const title = cleanText($(el).text());
      if (!title || title.length < 15) return; // skip nav/footer links

      const resolvedUrl = resolveUrl(href, baseOrigin);
      if (!resolvedUrl || resolvedUrl === pageUrl) return;
      if (!isSameDomain(resolvedUrl, baseOrigin))   return;
      if (items.find((i) => i.url === resolvedUrl)) return; // dedup

      items.push({ title, url: resolvedUrl, content: "", publishedAt: null });
    });
  }

  // ── Strategy 3: OG fallback — treat the page itself as one article ─────────
  if (items.length === 0) {
    const ogTitle   = $('meta[property="og:title"]').attr("content")   || $("title").text().trim();
    const ogDesc    = $('meta[property="og:description"]').attr("content") || "";
    const canonical = $('link[rel="canonical"]').attr("href")          || pageUrl;

    if (ogTitle) {
      items.push({
        title:       cleanText(ogTitle),
        url:         canonical,
        content:     cleanText(ogDesc),
        publishedAt: null,
      });
    }
  }

  if (items.length === 0) {
    return { items: [], error: `No articles found at ${pageUrl} — the site may block scrapers or require JS` };
  }

  return { items: items.slice(0, MAX_ITEMS) };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUrl(href: string, baseOrigin: string): string | null {
  try {
    if (href.startsWith("http")) return href;
    if (href.startsWith("//"))   return "https:" + href;
    if (href.startsWith("/"))    return baseOrigin + href;
    return null; // relative without base — too risky
  } catch {
    return null;
  }
}

function isSameDomain(url: string, origin: string): boolean {
  try {
    const urlHost    = new URL(url).hostname;
    const originHost = new URL(origin).hostname;
    return urlHost === originHost || urlHost.endsWith("." + originHost);
  } catch {
    return false;
  }
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseDate(str: string): Date | null {
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
