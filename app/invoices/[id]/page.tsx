import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/InvoiceActions";
import { requireProfile } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { invoiceLabel, invoiceText } from "@/lib/invoice";
import { loadInvoice } from "@/lib/load-invoice";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const invoice = await loadInvoice(supabase, id);
  if (!invoice) notFound();

  const link = `${appUrl()}/i/${invoice.public_token}`;
  return (
    <main>
      <p className="noprint" style={{ margin: "8px 0 0" }}>
        <Link href="/invoices">← Invoices</Link>
      </p>
      <h1>
        {invoiceLabel(invoice.number)} · {invoice.customer_name || "Customer"}
      </h1>
      <InvoiceActions invoice={invoice} profile={profile} link={link} text={invoiceText(invoice, profile, link)} />
    </main>
  );
}
