// app/api/cron/source-health/route.ts
// Runs daily at 08:00 UTC — 2 hours after the digest cron.
// Responsibilities:
//   1. Find sources that were auto-deactivated (isHealthy: false)
//   2. Re-test them — if they respond now, reactivate automatically
//   3. Send a "source deactivated" email to the owner so they can fix the URL
//   4. Clean up DigestRunLog entries older than 30 days (keep DB lean)
//
// vercel.json schedule: "0 8 * * *"

import { NextRequest, NextResponse } from "next/server";
import { db }     from "@/lib/db";
import { resend } from "@/lib/email";
import { fetchSource } from "@/lib/fetchers";

const LOG_RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = req.headers.get("authorization");
  const secret = auth?.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results = {
    reactivated:    0,
    stillBroken:    0,
    emailsSent:     0,
    logsDeleted:    0,
  };

  // ── 1. Find unhealthy sources ─────────────────────────────────────────────
  const unhealthySources = await db.sourceHealth.findMany({
    where: {
      isHealthy: false,
    },
  });

  // Get the actual source + user data
  const sourceDetails = await Promise.all(
    unhealthySources.map(async (sh) => {
      const source = await db.source.findUnique({
        where:   { id: sh.sourceId },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      return { health: sh, source };
    })
  );

  // ── 2. Re-test each unhealthy source ──────────────────────────────────────
  for (const { health, source } of sourceDetails) {
    if (!source) continue;

    const { items, error } = await fetchSource(source.type, source.url);

    if (!error && items.length >= 0) {
      // Source recovered — reactivate
      await db.source.update({
        where: { id: source.id },
        data:  { isActive: true },
      });
      await db.sourceHealth.update({
        where: { sourceId: source.id },
        data:  { isHealthy: true, consecutiveFails: 0 },
      });
      results.reactivated++;

      // Notify user their source is back
      if (source.user?.email) {
        await resend.emails.send({
          from:    process.env.EMAIL_FROM ?? "digest@resend.dev",
          to:      source.user.email,
          subject: `✅ Source "${source.name}" is working again`,
          html:    buildRecoveredEmail(source.name, source.user.name),
        }).catch(() => {});
        results.emailsSent++;
      }
    } else {
      results.stillBroken++;

      // Send "source deactivated" email once (check lastErrorAt to avoid spam)
      const daysSinceLastError = health.lastErrorAt
        ? (Date.now() - health.lastErrorAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      // Only email if this is a fresh deactivation (< 2 days old)
      if (source.user?.email && daysSinceLastError < 2) {
        await resend.emails.send({
          from:    process.env.EMAIL_FROM ?? "digest@resend.dev",
          to:      source.user.email,
          subject: `⚠️ Source "${source.name}" was deactivated`,
          html:    buildDeactivatedEmail(source.name, source.url, source.user.name, health.lastError),
        }).catch(() => {});
        results.emailsSent++;
      }
    }
  }

  // ── 3. Clean up old DigestRunLogs ─────────────────────────────────────────
  const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await db.digestRunLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  results.logsDeleted = deleted.count;

  // Also clean old DigestRun records (keep last 90 days)
  const runCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.digestRun.deleteMany({
    where: { startedAt: { lt: runCutoff } },
  });

  // Clean expired or used password reset tokens (older than 24 hours)
  const tokenCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: tokenCutoff } },
        { usedAt:    { not: null, lt: tokenCutoff } },
      ],
    },
  });

  return NextResponse.json({
    message:   "Source health check complete.",
    timestamp: new Date().toISOString(),
    ...results,
  });
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildDeactivatedEmail(
  sourceName: string,
  sourceUrl:  string,
  userName:   string | null,
  lastError:  string | null | undefined
): string {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;color:#1a1a1a;">
  <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">AI Digest</p>
  <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">A source was deactivated</h2>
  <p style="font-size:14px;color:#6b6b6b;line-height:1.6;margin:0 0 16px;">
    Hi ${userName ?? "there"}, your source <strong>${sourceName}</strong> failed to load 5 times in a row and has been automatically deactivated.
  </p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:0 0 16px;">
    <p style="font-size:12px;font-family:monospace;color:#991b1b;margin:0;word-break:break-all;">${sourceUrl}</p>
    ${lastError ? `<p style="font-size:12px;color:#b91c1c;margin:8px 0 0;">${lastError}</p>` : ""}
  </div>
  <p style="font-size:14px;color:#6b6b6b;line-height:1.6;margin:0 0 20px;">
    Check that the URL is still valid, then re-enable it from your Sources settings.
  </p>
  <a href="${process.env.NEXTAUTH_URL}/settings/sources"
     style="display:inline-block;background:#1a1a1a;color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
    Manage sources
  </a>
  <p style="font-size:11px;color:#a3a3a3;margin-top:24px;">
    <a href="${process.env.NEXTAUTH_URL}/settings/notifications" style="color:#9ca3af;">Unsubscribe from alerts</a>
  </p>
</body></html>`;
}

function buildRecoveredEmail(sourceName: string, userName: string | null): string {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;color:#1a1a1a;">
  <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">AI Digest</p>
  <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">Source recovered ✅</h2>
  <p style="font-size:14px;color:#6b6b6b;line-height:1.6;margin:0 0 16px;">
    Hi ${userName ?? "there"}, your source <strong>${sourceName}</strong> is responding again and has been automatically reactivated.
  </p>
  <a href="${process.env.NEXTAUTH_URL}/dashboard"
     style="display:inline-block;background:#1a1a1a;color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
    View digest
  </a>
</body></html>`;
}
