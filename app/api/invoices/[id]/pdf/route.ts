import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { invoiceLabel } from "@/lib/invoice";
import { loadInvoice } from "@/lib/load-invoice";
import { renderInvoicePdf } from "@/lib/pdf";
import type { Profile } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const invoice = await loadInvoice(supabase, id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const pdf = await renderInvoicePdf(invoice, profile as Profile);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoiceLabel(invoice.number).slice(1)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
