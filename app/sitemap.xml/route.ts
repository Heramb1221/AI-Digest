// app/sitemap.xml/route.ts
import { NextResponse } from "next/server";

export function GET() {
  const base = process.env.NEXTAUTH_URL ?? "https://ai-digest.vercel.app";
  const pages = ["/", "/privacy", "/terms"];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map((p) => `<url><loc>${base}${p}</loc></url>`).join("\n  ")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
