// middleware.ts
// Runs on every request before it reaches a route handler or page.
// Responsibilities:
//  1. Redirect unauthenticated users away from app routes → /login
//  2. Redirect authenticated users away from auth pages  → /dashboard
//  3. Return 401 for unauthenticated API calls (non-auth, non-webhook routes)

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: any }) => {
  const { nextUrl } = req;
  const isLoggedIn  = !!req.auth?.user;
  const path        = nextUrl.pathname;

  // ── Route classification ─────────────────────────────────────────────────
  const isAuthPage = path === "/login"            ||
                     path === "/signup"           ||
                     path === "/forgot-password"  ||
                     path.startsWith("/reset-password") ||
                     path.startsWith("/accept-invite");

  const isAppPage  = path.startsWith("/dashboard")  ||
                     path.startsWith("/settings")   ||
                     path.startsWith("/team")        ||
                     path.startsWith("/onboarding")  ||
                     path.startsWith("/admin");

  const isProtectedApi = path.startsWith("/api/") &&
                         !path.startsWith("/api/auth/") &&
                         !path.startsWith("/api/stripe/webhook") &&
                         path !== "/api/health";

  // ── Unauthenticated guards ────────────────────────────────────────────────
  if (!isLoggedIn) {
    if (isAppPage) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Authenticated: redirect away from login/signup only
  // (forgot-password, reset-password, accept-invite stay accessible when logged in)
  if (isLoggedIn && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run middleware on everything except:
  // - Next.js internals (_next/static, _next/image)
  // - favicon & public files
  // - Stripe webhook (needs raw body, not JWT check)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
