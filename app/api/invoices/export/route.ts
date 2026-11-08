import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { normalizeItems } from "@/lib/invoice";
import { bpsToPercentString, centsToDollarString } from "@/lib/money";
import { renderInvoicePdf } from "@/lib/pdf";
import type { InvoiceWithItems, Profile, Signature } from "@/lib/types";
import { uiT } from "@/lib/ui-server";

export const maxDuration = 60;

const MAX_PDF_INVOICES = 300;
const query = z.object({ year: z.coerce.number().int().min(2000).max(2100), format: z.enum(["csv", "pdf"]) });

type Row = InvoiceWithItems & { line_items: { description: string; quantity: number | string; rate_cents: number; position: number }[] };

function csvCell(v: string | number): string {
  const s = String(v);
  // Quote everything; also stop spreadsheet apps from treating a cell as a formula.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** A year of invoices (estimates left out) as a spreadsheet or one combined PDF, for taxes and records. */
export async function GET(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });

  const params = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return NextResponse.json({ error: await uiT("Invalid request.") }, { status: 400 });
  const { year, format } = params.data;

  const { data, error } = await supabase
    .from("invoices")
    .select("*, line_items(description, quantity, rate_cents, position)")
    .gte("issued_on", `${year}-01-01`)
    .lte("issued_on", `${year}-12-31`)
    .order("number", { ascending: true })
    .limit(2000);
  if (error) return NextResponse.json({ error: await uiT("Something went wrong. Try again.") }, { status: 500 });
  const invoices = ((data ?? []) as Row[])
    .filter((r) => r.doc_type !== "estimate")
    .map((r) => ({ ...r, line_items: normalizeItems([...r.line_items].sort((a, b) => a.position - b.position)) }));

  if (format === "csv") {
    const header = ["Invoice #", "Date", "Customer", "Customer email", "Subtotal", "Tax rate %", "Tax", "Total", "Status", "Paid on", "Paid by"];
    const lines = [header.map(csvCell).join(",")];
    let sub = 0, tax = 0, total = 0, paid = 0;
    for (const i of invoices) {
      sub += i.subtotal_cents;
      tax += i.tax_cents;
      total += i.total_cents;
      if (i.status === "paid") paid += i.total_cents;
      lines.push(
        [
          String(i.number).padStart(4, "0"),
          i.issued_on,
          i.customer_name,
          i.customer_email,
          centsToDollarString(i.subtotal_cents),
          bpsToPercentString(i.tax_rate_bps),
          centsToDollarString(i.tax_cents),
          centsToDollarString(i.total_cents),
          i.status,
          i.paid_at ? i.paid_at.slice(0, 10) : "",
          i.paid_via === "card" ? "card" : i.status === "paid" ? "other" : "",
        ]
          .map(csvCell)
          .join(","),
      );
    }
    lines.push("");
    lines.push([`TOTAL (${invoices.length} invoices)`, "", "", "", centsToDollarString(sub), "", centsToDollarString(tax), centsToDollarString(total), "", "", ""].map(csvCell).join(","));
    lines.push(["Paid", "", "", "", "", "", "", centsToDollarString(paid), "", "", ""].map(csvCell).join(","));
    lines.push(["Unpaid", "", "", "", "", "", "", centsToDollarString(total - paid), "", "", ""].map(csvCell).join(","));
    // The BOM makes Excel read the file as UTF-8 (names with accents stay correct).
    return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="voicebill-invoices-${year}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (!invoices.length) return NextResponse.json({ error: await uiT("No invoices in that year.") }, { status: 404 });
  if (invoices.length > MAX_PDF_INVOICES) {
    return NextResponse.json({ error: await uiT("Too many invoices for one PDF. Download the spreadsheet instead.") }, { status: 413 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  // Signatures are optional (0006 migration); load them all at once.
  const { data: sigRows } = await supabase
    .from("invoice_signatures")
    .select("invoice_id, kind, signer_name, image, total_cents, signed_on")
    .in("invoice_id", invoices.map((i) => i.id));
  const sigs = new Map<string, Signature[]>();
  for (const s of (sigRows ?? []) as (Signature & { invoice_id: string })[]) {
    sigs.set(s.invoice_id, [...(sigs.get(s.invoice_id) ?? []), s].sort((a, b) => (a.kind === "approve" ? -1 : 1) - (b.kind === "approve" ? -1 : 1)));
  }

  const combined = await PDFDocument.create();
  combined.setTitle(`Invoices ${year}`);
  combined.setCreator("VoiceBill Pro");
  for (const inv of invoices) {
    const bytes = await renderInvoicePdf({ ...inv, signatures: sigs.get(inv.id) ?? [] }, profile as Profile);
    const one = await PDFDocument.load(bytes);
    for (const page of await combined.copyPages(one, one.getPageIndices())) combined.addPage(page);
  }
  return new NextResponse(Buffer.from(await combined.save()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="voicebill-invoices-${year}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
