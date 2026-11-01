import "server-only";
import { isAdminEmail } from "@/lib/admin";
import { escapeHtml, resend } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

const NOTIFY_TO = () => process.env.SIGNUP_NOTIFY_EMAIL || process.env.SUPPORT_EMAIL || "support@voicebillpro.com";

/**
 * Emails the owner the first time a new account reaches the app. Claims the
 * account atomically, so two page loads at once still send a single email.
 * Does nothing until the 0004 migration adds signup_notified_at.
 */
export async function notifyIfNewSignup(profile: Profile) {
  if (profile.signup_notified_at !== null) return; // already sent, or migration not run (undefined)

  const admin = createAdminClient();
  const { data: claimed } = await admin
    .from("profiles")
    .update({ signup_notified_at: new Date().toISOString() })
    .eq("id", profile.id)
    .is("signup_notified_at", null)
    .select("id");
  if (!claimed?.length) return;
  if (isAdminEmail(profile.email)) return; // don't announce the owner's own test accounts
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;

  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const when = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" });
  const total = count ? `This is sign-up #${count}.` : "";

  try {
    await resend().emails.send({
      from: process.env.EMAIL_FROM,
      to: NOTIFY_TO(),
      replyTo: profile.email,
      subject: `🎉 New sign-up: ${profile.email}`,
      text: `${profile.email} just signed up for VoiceBill Pro (${when} Central). ${total}\n\nSee everyone: ${appUrl()}/admin\n\nTip: reply to this email to say hi; it goes straight to them.`,
      html: `<div style="font:16px/1.5 system-ui,sans-serif;color:#1c1c1a">
<p>🎉 <b>${escapeHtml(profile.email)}</b> just signed up for VoiceBill Pro.</p>
<p style="color:#6b6a64">${escapeHtml(when)} Central. ${escapeHtml(total)}</p>
<p><a href="${appUrl()}/admin" style="display:inline-block;background:#e8590c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Open owner dashboard</a></p>
<p style="color:#6b6a64;font-size:14px">Tip: hit Reply to say hi. It goes straight to them.</p></div>`,
    });
  } catch (err) {
    console.error("signup notify failed", err);
  }
}
