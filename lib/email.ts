// lib/email.ts
// Wraps Resend for transactional email.
// Used for:
//   1. Daily digest email (paid feature)
//   2. Team invite emails (Phase 4)

import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DigestArticle {
  title:      string;
  summary:    string;
  url:        string;
  category:   string;
  importance: number;
  sourceName: string;
}

// ─── Daily digest email ───────────────────────────────────────────────────────

export async function sendDailyDigestEmail(
  to:       string,
  userName: string,
  articles: DigestArticle[],
  tldr?:    string
): Promise<{ success: boolean; error?: string }> {
  if (articles.length === 0) return { success: true }; // nothing to send

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  // Group by category
  const grouped = articles.reduce<Record<string, DigestArticle[]>>((acc, a) => {
    acc[a.category] = [...(acc[a.category] ?? []), a];
    return acc;
  }, {});

  const importanceDot = (n: number) => {
    const colors: Record<number, string> = {
      5: "#ef4444", 4: "#f97316", 3: "#3b82f6", 2: "#94a3b8", 1: "#e2e8f0",
    };
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[n] ?? "#94a3b8"};margin-right:6px;vertical-align:middle;"></span>`;
  };

  const categoryColor: Record<string, string> = {
    TECHNICAL:     "#0369a1",
    BUSINESS:      "#854d0e",
    TRENDS:        "#7e22ce",
    TOOLS:         "#166534",
    NEWS:          "#c2410c",
    UNCATEGORISED: "#6b7280",
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Digest — ${dateStr}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:32px 20px;color:#1a1a1a;background:#fafaf9;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr>
      <td>
        <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin:0 0 4px;">AI Digest</p>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;letter-spacing:-0.3px;">Your Morning Briefing</h1>
        <p style="font-size:13px;color:#9ca3af;margin:0;">${dateStr}</p>
      </td>
    </tr>
  </table>

  ${tldr ? `
  <!-- TL;DR -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr>
      <td style="background:#f0f9ff;border-left:3px solid #3b82f6;padding:14px 16px;border-radius:0 6px 6px 0;">
        <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#3b82f6;margin:0 0 6px;">Today's TL;DR</p>
        <p style="font-size:14px;line-height:1.6;color:#1a1a1a;margin:0;">${tldr}</p>
      </td>
    </tr>
  </table>
  ` : ""}

  <!-- Articles by category -->
  ${Object.entries(grouped).map(([cat, items]) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding-bottom:10px;border-bottom:1px solid #e5e5e3;">
        <span style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${categoryColor[cat] ?? "#6b7280"};">${cat}</span>
      </td>
    </tr>
    ${items.map((a) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #f3f3f1;">
        <p style="margin:0 0 4px;">
          ${importanceDot(a.importance)}
          <a href="${a.url}" style="font-size:15px;font-weight:600;color:#1a1a1a;text-decoration:none;" target="_blank">${a.title}</a>
        </p>
        ${a.summary ? `<p style="font-size:13px;color:#6b6b6b;line-height:1.6;margin:4px 0 0 14px;">${a.summary}</p>` : ""}
        <p style="font-size:11px;color:#a3a3a3;margin:4px 0 0 14px;">${a.sourceName}</p>
      </td>
    </tr>
    `).join("")}
  </table>
  `).join("")}

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e3;">
    <tr>
      <td style="font-size:11px;color:#a3a3a3;line-height:1.6;">
        You're getting this because you enabled daily digest emails in
        <a href="${process.env.NEXTAUTH_URL}/settings/notifications" style="color:#6b7280;">AI Digest</a>.<br>
        <a href="${process.env.NEXTAUTH_URL}/settings/notifications" style="color:#6b7280;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="color:#6b7280;">Open app</a>
      </td>
    </tr>
  </table>

</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from:    process.env.EMAIL_FROM ?? "digest@resend.dev",
      to,
      subject: `Your digest · ${dateStr}`,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] sendDailyDigestEmail failed:", msg);
    return { success: false, error: msg };
  }
}

// ─── Team invite email ────────────────────────────────────────────────────────

export async function sendTeamInviteEmail(
  to:       string,
  invitedBy: string,
  teamName:  string,
  inviteUrl: string
): Promise<{ success: boolean; error?: string }> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>You're invited to ${teamName}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#fafaf9;">
  <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin:0 0 24px;">AI Digest</p>
  <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;">You've been invited</h1>
  <p style="font-size:14px;color:#6b6b6b;line-height:1.6;margin:0 0 24px;">
    <strong>${invitedBy}</strong> has invited you to join the <strong>${teamName}</strong> workspace on AI Digest.
  </p>
  <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:6px;text-decoration:none;">Accept invite</a>
  <p style="font-size:11px;color:#a3a3a3;margin-top:24px;">This invite expires in 7 days.</p>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from:    process.env.EMAIL_FROM ?? "digest@resend.dev",
      to,
      subject: `${invitedBy} invited you to ${teamName} on AI Digest`,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
