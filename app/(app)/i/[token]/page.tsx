import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/InvoiceView";
import { PayButton } from "@/components/PayButton";
import { canPayByCard, recordCardPayment, syncCardPayment } from "@/lib/card-payments";
import { t } from "@/lib/i18n";
import { businessName, docWords, invoiceLabel } from "@/lib/invoice";
import { loadPublicInvoice } from "@/lib/load-invoice";
import { formatCents } from "@/lib/money";
import { stripe } from "@/lib/stripe";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await loadPublicInvoice((await params).token);
  if (!found) return { title: "Invoice" };
  return {
    title: docWords(found.invoice).subject(invoiceLabel(found.invoice.number), businessName(found.profile, t(found.invoice.language).yourBusiness)),
    robots: { index: false, follow: false },
  };
}

/** Customer-facing invoice link. Anyone with the unguessable token can view it. */
export default async function PublicInvoicePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { session_id } = await searchParams;
  const found = await loadPublicInvoice(token);
  if (!found) notFound();

  // Back from Stripe Checkout: confirm with Stripe before showing "paid".
  let justPaid = false;
  let pending = false;
  if (found.invoice.status === "unpaid" && found.profile.stripe_account_id) {
    let changed = false;
    if (session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)) {
      try {
        const session = await stripe().checkout.sessions.retrieve(session_id, {}, { stripeAccount: found.profile.stripe_account_id });
        if (session.metadata?.invoice_id === found.invoice.id) {
          changed = await recordCardPayment(session, found.profile.stripe_account_id);
          pending = !changed && session.status === "complete";
        }
      } catch (err) {
        console.error("pay: return check failed", err);
      }
    } else {
      changed = await syncCardPayment(found.invoice, found.profile);
    }
    if (changed) {
      // Show it paid now. (Re-fetching here could return the copy Next.js already loaded in this request.)
      justPaid = true;
      found.invoice = { ...found.invoice, status: "paid", paid_via: "card" };
    }
  } else if (session_id && found.invoice.status === "paid") {
    justPaid = true;
  }

  const L = t(found.invoice.language);
  return (
    <main className="publicInvoice" lang={found.invoice.language === "es" ? "es" : "en"}>
      {justPaid && <div className="paidBanner noprint">✓ {L.paymentReceived}</div>}
      {pending && <div className="warn noprint">{L.paymentPending}</div>}
      {canPayByCard(found.invoice, found.profile) && !pending && (
        <PayButton token={token} label={L.payByCard(formatCents(found.invoice.total_cents))} errorText={L.payUnavailable} />
      )}
      <InvoiceView invoice={found.invoice} profile={found.profile} />
      <div className="btns noprint">
        <a className="btn alt" href={`/i/${token}/pdf`}>{L.downloadPdf}</a>
      </div>
    </main>
  );
}
