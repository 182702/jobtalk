import { NextResponse } from "next/server";
import { t } from "@/lib/i18n";
import { invoiceLabel } from "@/lib/invoice";
import { loadPublicInvoice } from "@/lib/load-invoice";
import { renderInvoicePdf } from "@/lib/pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const found = await loadPublicInvoice((await params).token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pdf = await renderInvoicePdf(found.invoice, found.profile);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${t(found.invoice.language).pdfName}-${invoiceLabel(found.invoice.number).slice(1)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
