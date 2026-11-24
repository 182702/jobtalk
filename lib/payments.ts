import type { InvoiceWithItems, Payment } from "@/lib/types";

export const PAYMENT_METHODS = ["cash", "check", "zelle", "venmo", "cashapp", "bank", "card", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Total recorded in payments, in cents. */
export function paidCents(payments: Pick<Payment, "amount_cents">[] | undefined | null): number {
  return (payments ?? []).reduce((sum, p) => sum + p.amount_cents, 0);
}

/**
 * What the customer still owes. A paid invoice owes nothing, even without
 * payment records (it may have been marked paid by hand).
 */
export function balanceCents(inv: Pick<InvoiceWithItems, "status" | "total_cents"> & { payments?: Pick<Payment, "amount_cents">[] }): number {
  if (inv.status === "paid") return 0;
  return Math.max(0, inv.total_cents - paidCents(inv.payments));
}

/** Status the invoice should have after its payments change. */
export function statusFromPayments(totalCents: number, payments: Pick<Payment, "amount_cents">[]): "paid" | "unpaid" {
  return payments.length > 0 && paidCents(payments) >= totalCents ? "paid" : "unpaid";
}
