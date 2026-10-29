import { bpsToPercentString, computeTotals, formatCents, formatQuantity } from "@/lib/money";
import type { InvoiceWithItems, LineItem, Profile } from "@/lib/types";
import { z } from "zod";

export function invoiceLabel(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}

export function formatDate(isoDate: string): string {
  // Dates are stored as plain YYYY-MM-DD; format without shifting time zones.
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function businessName(profile: Pick<Profile, "business_name">): string {
  return profile.business_name.trim() || "Your Business";
}

export function logoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${logoPath}`;
}

export function missingPriceCount(items: LineItem[]): number {
  return items.filter((i) => !(i.rate_cents > 0)).length;
}

/** Plain-text version for copy/paste into a text message or email. */
export function invoiceText(inv: InvoiceWithItems, profile: Profile, link?: string): string {
  const lines: string[] = [
    businessName(profile),
    `Invoice ${invoiceLabel(inv.number)} for ${inv.customer_name || "Customer"} · ${formatDate(inv.issued_on)}`,
    "",
  ];
  for (const it of inv.line_items) {
    const totals = computeTotals([it], 0);
    lines.push(`${it.description} — ${formatQuantity(it.quantity)} × ${formatCents(it.rate_cents)} = ${formatCents(totals.subtotal_cents)}`);
  }
  lines.push("", `Subtotal: ${formatCents(inv.subtotal_cents)}`);
  if (inv.tax_rate_bps > 0) lines.push(`Tax (${bpsToPercentString(inv.tax_rate_bps)}%): ${formatCents(inv.tax_cents)}`);
  lines.push(`Total due: ${formatCents(inv.total_cents)}`);
  if (inv.notes) lines.push("", inv.notes);
  if (profile.payment_instructions) lines.push("", "How to pay:", profile.payment_instructions);
  if (link) lines.push("", `View invoice: ${link}`);
  return lines.join("\n");
}

// Validation for invoices coming from the browser. Totals are always
// recomputed on the server; the client's numbers are never trusted.
export const lineItemSchema = z.object({
  description: z.string().trim().max(500),
  quantity: z.number().min(0).max(100000),
  rate_cents: z.number().int().min(0).max(100_000_000),
});

export const draftSchema = z.object({
  customer_name: z.string().trim().max(200),
  customer_email: z.union([z.literal(""), z.string().trim().email().max(320)]),
  issued_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(4000),
  original_note: z.string().max(10000).default(""),
  tax_rate_bps: z.number().int().min(0).max(10000),
  items: z.array(lineItemSchema).min(1).max(100),
});

export function draftToRpcPayload(draft: z.infer<typeof draftSchema>) {
  const items = draft.items.map((i) => ({ ...i, quantity: Math.round(i.quantity * 100) / 100 }));
  const totals = computeTotals(items, draft.tax_rate_bps);
  return {
    invoice: {
      customer_name: draft.customer_name,
      customer_email: draft.customer_email,
      issued_on: draft.issued_on,
      notes: draft.notes,
      original_note: draft.original_note,
      tax_rate_bps: draft.tax_rate_bps,
      subtotal_cents: totals.subtotal_cents,
      tax_cents: totals.tax_cents,
      total_cents: totals.total_cents,
    },
    items,
  };
}

/** Postgres numeric comes back as a string; normalize line items. */
export function normalizeItems(rows: { description: string; quantity: number | string; rate_cents: number }[]): LineItem[] {
  return rows.map((r) => ({ description: r.description, quantity: Number(r.quantity), rate_cents: r.rate_cents }));
}
