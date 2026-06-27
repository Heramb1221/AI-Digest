// app/api/sources/opml/route.ts
// Parses an OPML 1.0 / 2.0 file and bulk-creates RSS sources for the user.
//
// OPML is the standard export format for every major RSS reader
// (Feedly, NewsBlur, Reeder, Inoreader, etc.).
// A valid OPML file is XML with nested <outline> elements.
// Each <outline> with an xmlUrl attribute is an RSS feed.

import { NextRequest, NextResponse } from "next/server";
import { XMLParser }     from "fast-xml-parser";
import { auth }          from "@/lib/auth";
import { db }            from "@/lib/db";
import { PLAN_LIMITS }   from "@/lib/plan";

// fast-xml-parser config
const xmlParser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: "@_",
  isArray:             (name) => name === "outline", // always treat outline as array
});

interface OutlineNode {
  "@_text"?:    string;
  "@_title"?:   string;
  "@_xmlUrl"?:  string;
  "@_type"?:    string;
  outline?:     OutlineNode | OutlineNode[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId  = session!.user.id;

  // Accept both text/xml and application/xml content types
  const body = await req.text();
  if (!body.trim()) {
    return NextResponse.json({ error: "Empty OPML file." }, { status: 400 });
  }

  // ── Parse OPML ──────────────────────────────────────────────────────────────
  let parsed: any;
  try {
    parsed = xmlParser.parse(body);
  } catch (err) {
    return NextResponse.json({ error: "Invalid OPML/XML file." }, { status: 400 });
  }

  const bodyNode = parsed?.opml?.body ?? parsed?.opml ?? parsed;
  const rootOutlines: OutlineNode[] = Array.isArray(bodyNode?.outline)
    ? bodyNode.outline
    : bodyNode?.outline
      ? [bodyNode.outline]
      : [];

  // ── Extract all feed outlines (recursive — OPML can be deeply nested) ──────
  const feeds = extractFeeds(rootOutlines);

  if (feeds.length === 0) {
    return NextResponse.json(
      { error: "No RSS feeds found in this OPML file." },
      { status: 400 }
    );
  }

  // ── Plan limit check ────────────────────────────────────────────────────────
  const user     = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
  const existing = await db.source.count({ where: { userId, isActive: true } });
  const limit    = PLAN_LIMITS[user.plan].sources;
  const canAdd   = Math.max(0, limit - existing);

  // Already-existing URLs for this user (avoid duplicates)
  const existingUrls = new Set(
    (await db.source.findMany({
      where:  { userId, isActive: true },
      select: { url: true },
    })).map((s) => s.url)
  );

  const toAdd = feeds
    .filter((f) => !existingUrls.has(f.xmlUrl))
    .slice(0, canAdd);

  // ── Bulk create ─────────────────────────────────────────────────────────────
  let created = 0;
  if (toAdd.length > 0) {
    const result = await db.source.createMany({
      data: toAdd.map((f) => ({
        userId,
        type: "RSS" as const,
        name: f.name.slice(0, 100),
        url:  f.xmlUrl,
      })),
      skipDuplicates: true,
    });
    created = result.count;
  }

  return NextResponse.json({
    total:    feeds.length,
    added:    created,
    skipped:  feeds.length - toAdd.length - (toAdd.length - created), // duplicates + plan-limited
    limited:  feeds.length > canAdd + existingUrls.size,
    planLimit: limit,
  });
}

// ─── Recursive OPML outline extractor ────────────────────────────────────────

interface FeedEntry { name: string; xmlUrl: string }

function extractFeeds(outlines: OutlineNode[]): FeedEntry[] {
  const results: FeedEntry[] = [];

  for (const node of outlines) {
    const xmlUrl = node["@_xmlUrl"];

    if (xmlUrl && xmlUrl.startsWith("http")) {
      // This is a feed outline
      results.push({
        name:   node["@_text"] ?? node["@_title"] ?? "Untitled feed",
        xmlUrl,
      });
    }

    // Recurse into nested outlines (OPML folders)
    if (node.outline) {
      const children = Array.isArray(node.outline) ? node.outline : [node.outline];
      results.push(...extractFeeds(children));
    }
  }

  return results;
}
