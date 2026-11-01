import "server-only";
import { contactEmail } from "@/lib/site";
import { adminDb } from "./secrets";

// Transactional email through Resend's HTTP API. Without RESEND_API_KEY nothing is sent (local work, previews),
// so callers never need to check. Emails never include session topics, client notes or message text: they say
// what happened and link back to the site, where everything stays behind sign-in.

export const SITE = "https://www.faithwellnesscounseling.com";
const FROM = "FaithWellness <noreply@faithwellnesscounseling.com>";

export const emailConfigured = Boolean(process.env.RESEND_API_KEY);

type Email = {
  to: string;
  subject: string;
  /** Plain paragraphs, separated by blank lines. */
  body: string;
  button?: { label: string; href: string };
};

/** Sends one email. Never throws: a failed email mustn't undo a booking or a review. */
export async function sendEmail({ to, subject, body, button }: Email) {
  if (!emailConfigured || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: contactEmail,
        subject,
        text: `${body}${button ? `\n\n${button.label}: ${button.href}` : ""}\n\n${FOOTER}`,
        html: html(body, button),
      }),
    });
    if (!res.ok) console.error("Email failed", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("Email failed", e instanceof Error ? e.message : e);
    return false;
  }
}

/** The email address on an account (from Supabase Auth, which only the server can read). */
export async function emailOf(userId: string) {
  const { data } = await adminDb().auth.admin.getUserById(userId);
  return data.user?.email ?? "";
}

/** "Mon, Nov 2 at 2:00 PM (Los Angeles time)" in the reader's own time zone. */
export function when(iso: string, timeZone: string) {
  const zone = timeZone || "America/Los_Angeles";
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: zone, weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" });
  return `${day} at ${time} (${zone.split("/").pop()!.replaceAll("_", " ")} time)`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

const FOOTER = "FaithWellness isn't an emergency service. In the US, call or text 988, or call 911.";

const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Simple branded layout: cream page, white card, peach button with slate text (as on the site). */
function html(body: string, button?: Email["button"]) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2D3748">${esc(p).replaceAll("\n", "<br>")}</p>`)
    .join("");
  const cta = button
    ? `<p style="margin:24px 0 8px"><a href="${esc(button.href)}" style="display:inline-block;background:#FF7A59;color:#2D3748;font-weight:700;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:999px">${esc(button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px;font-family:Georgia,serif;font-size:22px;color:#2D3748">FaithWellness</td></tr>
<tr><td style="background:#ffffff;border:1px solid #EFE7DD;border-radius:24px;padding:28px">${paragraphs}${cta}</td></tr>
<tr><td style="padding:16px 4px;font-size:13px;line-height:1.5;color:#5A6577">${esc(FOOTER)}<br>Questions? Reply to this email or write to ${esc(contactEmail)}.</td></tr>
</table></td></tr></table></body></html>`;
}
