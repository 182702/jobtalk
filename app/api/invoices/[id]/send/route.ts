import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { escapeHtml, resend } from "@/lib/email";
import { appUrl, requireEnv } from "@/lib/env";
import { businessName, invoiceLabel, invoiceText, missingPriceCount } from "@/lib/invoice";
import { t } from "@/lib/i18n";
import { loadInvoice } from "@/lib/load-invoice";
import { formatCents } from "@/lib/money";
import { renderInvoicePdf } from "@/lib/pdf";
import type { Profile } from "@/lib/types";

export const maxDuration = 30;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const invoice = await loadInvoice(supabase, id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (!invoice.customer_email) return NextResponse.json({ error: "Add the customer's email first." }, { status: 400 });

  // The client shows this warning and asks to confirm; the server double-checks.
  const { confirmMissingPrices } = (await request.json().catch(() => ({}))) as { confirmMissingPrices?: boolean };
  const missing = missingPriceCount(invoice.line_items);
  if (missing > 0 && !confirmMissingPrices) {
    return NextResponse.json(
      { error: `${missing} line${missing === 1 ? " has" : "s have"} no price.`, missingPrices: missing },
      { status: 409 },
    );
  }

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRow as Profile;
  const L = t(invoice.language);
  const biz = businessName(profile, L.yourBusiness);
  const num = invoiceLabel(invoice.number);
  const link = `${appUrl()}/i/${invoice.public_token}`;
  const pdf = await renderInvoicePdf(invoice, profile);

  const html = `<div style="font:16px/1.5 system-ui,sans-serif;color:#1c1c1a;max-width:560px">
<p>${escapeHtml(L.emailGreeting(invoice.customer_name))}</p>
<p>${L.emailBody(num, escapeHtml(biz), formatCents(invoice.total_cents))}</p>
<p><a href="${link}" style="display:inline-block;background:#e8590c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${L.viewInvoice}</a></p>
${profile.payment_instructions ? `<p><b>${L.howToPay}</b><br>${escapeHtml(profile.payment_instructions).replace(/\n/g, "<br>")}</p>` : ""}
<p>${L.emailAttached}</p>
<p>${L.emailThanks}<br>${escapeHtml(biz)}</p>
<p style="color:#6b6a64;font-size:12px">${L.madeWith}</p></div>`;

  let sendError: unknown;
  try {
    const { error } = await resend().emails.send({
      from: requireEnv("EMAIL_FROM"),
      to: invoice.customer_email,
      replyTo: profile.email,
      subject: L.emailSubject(num, biz),
      html,
      text: invoiceText(invoice, profile, link),
      attachments: [{ filename: `${L.pdfName}-${num.slice(1)}.pdf`, content: Buffer.from(pdf) }],
    });
    sendError = error;
  } catch (err) {
    sendError = err; // e.g. email not configured
  }
  if (sendError) {
    console.error("send failed", sendError);
    return NextResponse.json({ error: "The email couldn't be sent. Check the address and try again." }, { status: 502 });
  }

  await supabase.from("invoices").update({ sent_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
