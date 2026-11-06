import { NextResponse } from "next/server";
import { escapeHtml, resend } from "@/lib/email";
import { appUrl, requireEnv } from "@/lib/env";
import { t } from "@/lib/i18n";
import { businessName, formatDate, invoiceLabel, missingPriceCount, normalizeItems } from "@/lib/invoice";
import { formatCents } from "@/lib/money";
import { MAX_REMINDERS, REMINDER_DAYS, reminderDue } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceWithItems, Profile } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Row = InvoiceWithItems & { user_id: string; line_items: { description: string; quantity: number | string; rate_cents: number }[] };

/**
 * Daily job (vercel.json) that emails customers about sent, unpaid invoices.
 * Safe to call more than once: each reminder is claimed in the database before
 * it is sent, and at most one goes out per invoice per day. When CRON_SECRET is
 * set, only Vercel's scheduler (which sends it) can run this.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - REMINDER_DAYS[0] * 24 * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from("invoices")
    .select("*, line_items(description, quantity, rate_cents)")
    .eq("status", "unpaid")
    .eq("reminders_off", false)
    .lt("reminders_sent", MAX_REMINDERS)
    .neq("customer_email", "")
    .not("sent_at", "is", null)
    .lte("sent_at", cutoff)
    .order("sent_at", { ascending: true })
    .limit(200);
  if (error) {
    // Most likely the 0007 migration hasn't run yet.
    console.error("reminders: query failed", error.message);
    return NextResponse.json({ sent: 0, note: "reminders not set up" });
  }

  const rows = (data ?? []) as Row[];
  const ownerIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = ownerIds.length
    ? await admin.from("profiles").select("*").in("id", ownerIds).eq("reminders_enabled", true)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p as Profile]));

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const profile = byId.get(row.user_id);
    if (!profile) continue; // owner hasn't turned reminders on
    const items = normalizeItems(row.line_items);
    if (missingPriceCount(items) > 0) continue; // the total isn't final; don't chase it
    const count = row.reminders_sent ?? 0;
    if (!reminderDue(row.sent_at, count, row.last_reminder_at ?? null)) continue;

    // Claim this reminder so a second run can't send it again.
    const now = new Date().toISOString();
    const { data: claimed } = await admin
      .from("invoices")
      .update({ reminders_sent: count + 1, last_reminder_at: now })
      .eq("id", row.id)
      .eq("reminders_sent", count)
      .eq("status", "unpaid")
      .select("id");
    if (!claimed?.length) continue;

    const L = t(row.language);
    const biz = businessName(profile, L.yourBusiness);
    const num = invoiceLabel(row.number);
    const link = `${appUrl()}/i/${row.public_token}`;
    // Customers are in the US; Central time keeps the date right for most of them.
    const sentOn = formatDate(new Date(row.sent_at!).toLocaleDateString("en-CA", { timeZone: "America/Chicago" }), L.dateLocale);
    const html = `<div style="font:16px/1.5 system-ui,sans-serif;color:#1c1c1a;max-width:560px">
<p>${escapeHtml(L.emailGreeting(row.customer_name))}</p>
<p>${L.reminderBody(num, escapeHtml(biz), formatCents(row.total_cents), sentOn)}</p>
<p><a href="${link}" style="display:inline-block;background:#e8590c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${L.viewInvoice}</a></p>
${profile.payment_instructions ? `<p><b>${L.howToPay}</b><br>${escapeHtml(profile.payment_instructions).replace(/\n/g, "<br>")}</p>` : ""}
<p>${L.reminderAlreadyPaid}</p>
<p>${L.emailThanks}<br>${escapeHtml(biz)}</p>
<p style="color:#6b6a64;font-size:12px">${L.madeWith}</p></div>`;
    const text = [
      L.emailGreeting(row.customer_name),
      "",
      L.reminderBody(num, biz, formatCents(row.total_cents), sentOn).replace(/<\/?b>/g, ""),
      "",
      `${L.viewInvoice}: ${link}`,
      ...(profile.payment_instructions ? ["", `${L.howToPay}:`, profile.payment_instructions] : []),
      "",
      L.reminderAlreadyPaid,
      "",
      L.emailThanks,
      biz,
    ].join("\n");

    let sendError: unknown;
    try {
      const { error: e } = await resend().emails.send({
        from: requireEnv("EMAIL_FROM"),
        to: row.customer_email,
        replyTo: profile.email,
        subject: L.reminderSubject(num, biz),
        html,
        text,
      });
      sendError = e;
    } catch (err) {
      sendError = err;
    }
    if (sendError) {
      failed++;
      console.error("reminders: send failed", row.id, sendError);
      // Give the reminder back so tomorrow's run tries again.
      await admin.from("invoices").update({ reminders_sent: count, last_reminder_at: row.last_reminder_at ?? null }).eq("id", row.id);
    } else {
      sent++;
    }
  }
  return NextResponse.json({ sent, failed, checked: rows.length });
}
