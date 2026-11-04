import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/InvoiceActions";
import { requireProfile } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { invoiceLabel, invoiceText } from "@/lib/invoice";
import { loadInvoice } from "@/lib/load-invoice";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const invoice = await loadInvoice(supabase, id);
  if (!invoice) notFound();

  const link = `${appUrl()}/i/${invoice.public_token}`;
  const lang = await getUiLang();
  const T = translator(lang);
  return (
    <main>
      <p className="noprint" style={{ margin: "8px 0 0" }}>
        <Link href="/invoices">{T("← Invoices")}</Link>
      </p>
      <h1>
        {invoiceLabel(invoice.number)} · {invoice.customer_name || T("Customer")}
      </h1>
      <InvoiceActions invoice={invoice} profile={profile} link={link} text={invoiceText(invoice, profile, link)} uiLang={lang} />
    </main>
  );
}
