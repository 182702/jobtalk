import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/InvoiceActions";
import { requireProfile } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { invoiceLabel, invoiceText } from "@/lib/invoice";
import { syncCardPayment } from "@/lib/card-payments";
import { loadInvoice } from "@/lib/load-invoice";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  let invoice = await loadInvoice(supabase, id);
  if (!invoice) notFound();
  // A customer may have paid by card while a Stripe notice was delayed: ask Stripe.
  if (await syncCardPayment(invoice, profile)) invoice = { ...invoice, status: "paid", paid_via: "card", paid_at: new Date().toISOString() };

  const link = `${appUrl()}/i/${invoice.public_token}`;
  const lang = await getUiLang();
  const T = translator(lang);
  return (
    <main>
      <p className="noprint" style={{ margin: "8px 0 0" }}>
        <Link href="/invoices">{T("← Invoices")}</Link>
      </p>
      <h1>
        {invoice.doc_type === "estimate" ? `${T("Estimate")} ` : ""}
        {invoiceLabel(invoice.number)} · {invoice.customer_name || T("Customer")}
      </h1>
      <InvoiceActions invoice={invoice} profile={profile} link={link} text={invoiceText(invoice, profile, link)} uiLang={lang} />
    </main>
  );
}
