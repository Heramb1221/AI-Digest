// lib/fetchers/reddit.ts
// Uses Reddit's public unauthenticated JSON API — no API key required.
// Rate limit: ~60 req/min per IP (far more than we need).
//
// Supported URL formats:
//   https://reddit.com/r/MachineLearning
//   https://www.reddit.com/r/programming/
//   r/webdev
//   MachineLearning   (bare name)

import type { FetchedItem, FetchResult } from "./types";

const MAX_ITEMS  = 15;
const TIMEOUT_MS = 10_000;

export async function fetchReddit(subredditUrl: string): Promise<FetchResult> {
  const subreddit = parseSubredditName(subredditUrl);
  if (!subreddit) {
    return { items: [], error: `Could not parse subreddit from: ${subredditUrl}` };
  }

  // Fetch hot posts — best signal-to-noise for a digest
  const apiUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${MAX_ITEMS}&raw_json=1`;

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      headers: { "User-Agent": "AIDigest/1.0 (https://aigestapp.com)" },
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return { items: [], error: `Reddit fetch failed for r/${subreddit}: ${err}` };
  }

  if (!res.ok) {
    // 403 = subreddit is private/quarantined
    // 404 = subreddit doesn't exist
    return { items: [], error: `Reddit returned ${res.status} for r/${subreddit}` };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { items: [], error: `Reddit returned invalid JSON for r/${subreddit}` };
  }

  const posts = data?.data?.children ?? [];

  const items: FetchedItem[] = posts
    // Skip pinned/stickied mod posts — they're never news
    .filter((c: any) => !c.data.stickied && !c.data.pinned)
    .map((c: any) => {
      const post = c.data;

      // Build the best content string available:
      // For text posts: use selftext (up to 3000 chars)
      // For link posts: use the external URL as context
      const content = post.is_self
        ? (post.selftext ?? "").slice(0, 3000)
        : `Link post pointing to: ${post.url}\n\n${post.selftext ?? ""}`.slice(0, 3000);

      return {
        title:       post.title,
        // Always use the Reddit permalink — not the external URL —
        // so we have a stable dedupe key even if the same link is posted twice
        url:         `https://www.reddit.com${post.permalink}`,
        content:     content.trim(),
        publishedAt: post.created_utc ? new Date(post.created_utc * 1000) : null,
      };
    })
    .filter((i: FetchedItem) => i.url && i.title);

  return { items };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSubredditName(input: string): string | null {
  // Already a bare name like "MachineLearning"
  if (/^[A-Za-z0-9_]+$/.test(input)) return input;

  // r/name
  const rMatch = input.match(/^r\/([A-Za-z0-9_]+)/);
  if (rMatch) return rMatch[1];

  // Full URL
  const urlMatch = input.match(/reddit\.com\/r\/([A-Za-z0-9_]+)/);
  if (urlMatch) return urlMatch[1];

  return null;
}
