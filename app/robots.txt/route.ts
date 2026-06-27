// app/robots.txt/route.ts
import { NextResponse } from "next/server";

export function GET() {
  const content = `User-agent: *
Allow: /
Allow: /privacy
Allow: /terms
Disallow: /dashboard
Disallow: /settings
Disallow: /team
Disallow: /admin
Disallow: /api/

Sitemap: ${process.env.NEXTAUTH_URL ?? "https://ai-digest.vercel.app"}/sitemap.xml
`;
  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
