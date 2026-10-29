import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/InvoiceView";
import { businessName, invoiceLabel } from "@/lib/invoice";
import { loadPublicInvoice } from "@/lib/load-invoice";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await loadPublicInvoice((await params).token);
  if (!found) return { title: "Invoice" };
  return {
    title: `Invoice ${invoiceLabel(found.invoice.number)} from ${businessName(found.profile)}`,
    robots: { index: false, follow: false },
  };
}

/** Customer-facing invoice link. Anyone with the unguessable token can view it. */
export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params;
  const found = await loadPublicInvoice(token);
  if (!found) notFound();

  return (
    <main>
      <InvoiceView invoice={found.invoice} profile={found.profile} />
      <div className="btns noprint">
        <a className="btn alt" href={`/i/${token}/pdf`}>Download PDF</a>
      </div>
    </main>
  );
}
