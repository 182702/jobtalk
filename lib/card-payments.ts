import "server-only";
import type Stripe from "stripe";
import { escapeHtml, resend } from "@/lib/email";
import { appUrl, requireEnv } from "@/lib/env";
import { t } from "@/lib/i18n";
import { businessName, invoiceLabel, missingPriceCount } from "@/lib/invoice";
import { formatCents } from "@/lib/money";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceWithItems, Profile } from "@/lib/types";

/** Stripe's minimum card charge in USD. */
export const MIN_CARD_CENTS = 50;

/** Optional platform fee in basis points (100 = 1%). Default 0: VoiceBill Pro takes nothing. */
export function platformFeeBps(): number {
  const n = Number(process.env.PLATFORM_FEE_BPS ?? 0);
  return Number.isFinite(n) && n > 0 && n <= 1000 ? Math.round(n) : 0;
}

/** Whether a customer can pay this invoice by card right now. */
export function canPayByCard(invoice: InvoiceWithItems, profile: Profile): boolean {
  return (
    profile.card_payments_enabled === true &&
    !!profile.stripe_account_id &&
    invoice.status === "unpaid" &&
    invoice.total_cents >= MIN_CARD_CENTS &&
    missingPriceCount(invoice.line_items) === 0
  );
}

/** Creates (or reuses) a Stripe Checkout page on the contractor's own account. */
export async function checkoutUrl(invoice: InvoiceWithItems, profile: Profile): Promise<string> {
  const account = profile.stripe_account_id!;
  const opts = { stripeAccount: account };

  // Reuse an open checkout for the same amount, so reloading doesn't pile up sessions.
  if (invoice.stripe_checkout_session_id) {
    try {
      const old = await stripe().checkout.sessions.retrieve(invoice.stripe_checkout_session_id, {}, opts);
      if (old.status === "open" && old.amount_total === invoice.total_cents && old.url) return old.url;
    } catch {
      // Expired or from another mode: make a new one.
    }
  }

  const L = t(invoice.language);
  const num = invoiceLabel(invoice.number);
  const biz = businessName(profile, L.yourBusiness);
  const link = `${appUrl()}/i/${invoice.public_token}`;
  const fee = Math.round((invoice.total_cents * platformFeeBps()) / 10000);
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: invoice.total_cents, product_data: { name: `${L.invoice} ${num} · ${biz}` } } }],
      customer_email: invoice.customer_email || undefined,
      metadata: { invoice_id: invoice.id },
      payment_intent_data: { metadata: { invoice_id: invoice.id }, description: `${L.invoice} ${num}`, ...(fee > 0 ? { application_fee_amount: fee } : {}) },
      locale: invoice.language === "es" ? "es" : "en",
      success_url: `${link}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: link,
    },
    opts,
  );
  await createAdminClient().from("invoices").update({ stripe_checkout_session_id: session.id }).eq("id", invoice.id);
  return session.url!;
}

/**
 * Marks an invoice paid from a completed Checkout session, after checking the
 * session really belongs to this invoice and to the invoice owner's account.
 * Safe to call many times: only the first call changes anything (and emails
 * the contractor). Returns true when the invoice is paid.
 */
export async function recordCardPayment(session: Stripe.Checkout.Session, account: string): Promise<boolean> {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId || session.mode !== "payment" || session.payment_status !== "paid") return false;

  const admin = createAdminClient();
  const { data: inv } = await admin.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!inv) return false;
  const { data: owner } = await admin.from("profiles").select("*").eq("id", inv.user_id).single();
  if (!owner || owner.stripe_account_id !== account) {
    console.error("card payment: account mismatch", { invoiceId, account });
    return false;
  }

  const now = new Date().toISOString();
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const { data: changed } = await admin
    .from("invoices")
    .update({ status: "paid", paid_at: now, updated_at: now, paid_via: "card", stripe_payment_intent_id: paymentIntent })
    .eq("id", invoiceId)
    .eq("status", "unpaid")
    .select("id");
  if (changed?.length) await notifyContractor(inv as InvoiceWithItems, owner as Profile, session.amount_total ?? inv.total_cents);
  return true;
}

/** Checks an invoice's last checkout with Stripe (for when a webhook is late or missing). */
export async function syncCardPayment(invoice: InvoiceWithItems, profile: Profile): Promise<boolean> {
  if (invoice.status !== "unpaid" || !invoice.stripe_checkout_session_id || !profile.stripe_account_id) return false;
  try {
    const session = await stripe().checkout.sessions.retrieve(invoice.stripe_checkout_session_id, {}, { stripeAccount: profile.stripe_account_id });
    return await recordCardPayment(session, profile.stripe_account_id);
  } catch (err) {
    console.error("card payment sync failed", invoice.id, err);
    return false;
  }
}

async function notifyContractor(inv: InvoiceWithItems, owner: Profile, amountCents: number) {
  const num = invoiceLabel(inv.number);
  const who = inv.customer_name || "Your customer";
  const amount = formatCents(amountCents);
  const short = amountCents < inv.total_cents ? ` That's less than the invoice total of ${formatCents(inv.total_cents)}, because the invoice changed after they opened the payment page.` : "";
  try {
    await resend().emails.send({
      from: requireEnv("EMAIL_FROM"),
      to: owner.email,
      subject: `💰 ${who} paid invoice ${num} (${amount})`,
      html: `<div style="font:16px/1.5 system-ui,sans-serif;color:#1c1c1a;max-width:560px">
<p><b>${escapeHtml(who)}</b> paid invoice ${num} by card: <b>${amount}</b>.${escapeHtml(short)}</p>
<p>The invoice is marked paid and any payment reminders have stopped. The money goes to your Stripe account; Stripe sends it to your bank on its usual payout schedule.</p>
<p><a href="${appUrl()}/invoices/${inv.id}">Open the invoice</a></p></div>`,
      text: `${who} paid invoice ${num} by card: ${amount}.${short}\n\nThe invoice is marked paid and any payment reminders have stopped. The money goes to your Stripe account; Stripe sends it to your bank on its usual payout schedule.\n\n${appUrl()}/invoices/${inv.id}`,
    });
  } catch (err) {
    console.error("card payment: contractor email failed", err);
  }
}
