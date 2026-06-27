// lib/logger.ts
// Thin structured logger — outputs JSON in production (Vercel log drain),
// human-readable in development.
//
// Usage:
//   import { log } from "@/lib/logger";
//   log.info("digest.run", { userId, articlesNew: 5 });
//   log.error("source.fetch", { sourceId, error: err.message });

const IS_DEV = process.env.NODE_ENV === "development";

type Level   = "info" | "warn" | "error" | "debug";
type Context = Record<string, unknown>;

function write(level: Level, event: string, ctx: Context = {}) {
  const entry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...ctx,
  };

  if (IS_DEV) {
    const prefix = {
      info:  "\x1b[36m[info]\x1b[0m ",   // cyan
      warn:  "\x1b[33m[warn]\x1b[0m ",   // yellow
      error: "\x1b[31m[error]\x1b[0m",   // red
      debug: "\x1b[90m[debug]\x1b[0m",   // grey
    }[level];
    const ctxStr = Object.keys(ctx).length > 0 ? " " + JSON.stringify(ctx) : "";
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`${prefix} ${event}${ctxStr}`);
  } else {
    // Vercel captures console.log as structured JSON if it parses cleanly
    console.log(JSON.stringify(entry));
  }
}

export const log = {
  info:  (event: string, ctx?: Context) => write("info",  event, ctx),
  warn:  (event: string, ctx?: Context) => write("warn",  event, ctx),
  error: (event: string, ctx?: Context) => write("error", event, ctx),
  debug: (event: string, ctx?: Context) => write("debug", event, ctx),
};
