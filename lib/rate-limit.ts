// lib/rate-limit.ts
// Lightweight in-memory rate limiter using a sliding-window counter.
// Suitable for Vercel serverless functions where each instance is isolated.
//
// For production at scale, replace the store with Upstash Redis:
//   https://upstash.com/docs/redis/sdks/ratelimit
//
// Usage:
//   const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
//   const { success, remaining } = await limiter.check(identifier);

interface RateLimitEntry {
  count:     number;
  resetAt:   number;
}

interface RateLimiterOptions {
  limit:    number;   // max requests per window
  windowMs: number;   // window size in milliseconds
}

interface RateLimitResult {
  success:   boolean;
  remaining: number;
  resetAt:   number;
}

// Module-level store — survives across requests in the same warm instance
const stores = new Map<string, Map<string, RateLimitEntry>>();

export function createRateLimiter(opts: RateLimiterOptions) {
  const storeKey = `${opts.limit}:${opts.windowMs}`;

  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }
  const store = stores.get(storeKey)!;

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();

      const entry = store.get(identifier);

      // New window or expired
      if (!entry || entry.resetAt <= now) {
        store.set(identifier, {
          count:   1,
          resetAt: now + opts.windowMs,
        });
        return { success: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
      }

      // Within window
      if (entry.count >= opts.limit) {
        return { success: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count++;
      store.set(identifier, entry);

      return {
        success:   true,
        remaining: opts.limit - entry.count,
        resetAt:   entry.resetAt,
      };
    },

    // Manually reset a key (e.g. after a successful operation)
    reset(identifier: string): void {
      store.delete(identifier);
    },
  };
}

// ─── Pre-built limiters ───────────────────────────────────────────────────────

// Auth endpoints: 10 attempts per 15 minutes per IP
export const authLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });

// Manual digest refresh: 3 per hour per user (belt-and-suspenders, DB check is primary)
export const digestRefreshLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60_000 });

// AI chat: 30 messages per hour per user
export const chatLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60_000 });
