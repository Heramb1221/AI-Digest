// lib/fetchers/youtube.ts
// Fetches the 10 most recent uploads from a YouTube channel.
//
// Supported URL formats:
//   https://youtube.com/@handle
//   https://youtube.com/channel/UCxxxxxxxx
//   https://youtube.com/c/channelname       (legacy custom URL — resolves via search)
//   https://youtu.be/... or watch?v=...     (rejected — not a channel)
//
// YouTube Data API v3 quota cost:
//   channels.list  = 1 unit
//   search.list    = 100 units
//   Total per fetch: 101 units (well within 10,000/day free quota)

import type { FetchedItem, FetchResult } from "./types";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 10;

export async function fetchYouTube(channelUrl: string): Promise<FetchResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { items: [], error: "YOUTUBE_API_KEY not set — skipping YouTube source" };
  }

  let channelId: string | null = null;

  try {
    channelId = await resolveChannelId(channelUrl, apiKey);
  } catch (err) {
    return { items: [], error: `Could not resolve YouTube channel: ${channelUrl}` };
  }

  if (!channelId) {
    return { items: [], error: `YouTube channel not found: ${channelUrl}` };
  }

  // Fetch latest videos via search.list (100 units)
  const searchUrl = new URL(`${YT_API_BASE}/search`);
  searchUrl.searchParams.set("part",       "snippet");
  searchUrl.searchParams.set("channelId",  channelId);
  searchUrl.searchParams.set("order",      "date");
  searchUrl.searchParams.set("maxResults", String(MAX_RESULTS));
  searchUrl.searchParams.set("type",       "video");
  searchUrl.searchParams.set("key",        apiKey);

  let res: Response;
  try {
    res = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    return { items: [], error: `YouTube API request failed: ${err}` };
  }

  if (!res.ok) {
    const body = await res.text();
    return { items: [], error: `YouTube API error ${res.status}: ${body.slice(0, 200)}` };
  }

  const data = await res.json();
  const items: FetchedItem[] = (data.items ?? [])
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => ({
      title:       item.snippet.title,
      url:         `https://www.youtube.com/watch?v=${item.id.videoId}`,
      // Description is the best proxy for content without fetching transcripts
      content:     [item.snippet.channelTitle, item.snippet.description]
                     .filter(Boolean)
                     .join("\n")
                     .slice(0, 2000),
      publishedAt: item.snippet.publishedAt ? new Date(item.snippet.publishedAt) : null,
    }));

  return { items };
}

// ─── Channel ID resolution ────────────────────────────────────────────────────

async function resolveChannelId(url: string, apiKey: string): Promise<string | null> {
  // Direct channel ID — UCxxxxxxxxxxxxxxxxxxxxxxxx
  const idMatch = url.match(/\/channel\/(UC[\w-]{22})/);
  if (idMatch) return idMatch[1];

  // Handle-based URL — @handle
  const handleMatch = url.match(/@([\w.-]+)/);
  if (handleMatch) {
    return resolveHandle(handleMatch[1], apiKey);
  }

  // Legacy /c/ URL — try searching by name
  const cMatch = url.match(/\/c\/([\w.-]+)/);
  if (cMatch) {
    return resolveBySearch(cMatch[1], apiKey);
  }

  // Last resort — try the whole URL segment as a handle
  const lastSegment = url.split("/").filter(Boolean).pop() ?? "";
  if (lastSegment && !lastSegment.includes("watch")) {
    return resolveHandle(lastSegment, apiKey);
  }

  return null;
}

async function resolveHandle(handle: string, apiKey: string): Promise<string | null> {
  // YouTube Data API v3: channels.list with forHandle (1 unit)
  const url = new URL(`${YT_API_BASE}/channels`);
  url.searchParams.set("part",      "id");
  url.searchParams.set("forHandle", handle.replace(/^@/, ""));
  url.searchParams.set("key",       apiKey);

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) });
  const data = await res.json();
  return data.items?.[0]?.id ?? null;
}

async function resolveBySearch(query: string, apiKey: string): Promise<string | null> {
  // search.list to find channel by name (100 units — last resort)
  const url = new URL(`${YT_API_BASE}/search`);
  url.searchParams.set("part",       "snippet");
  url.searchParams.set("q",          query);
  url.searchParams.set("type",       "channel");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key",        apiKey);

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) });
  const data = await res.json();
  return data.items?.[0]?.id?.channelId ?? null;
}
