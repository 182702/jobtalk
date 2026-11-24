import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { statusFromPayments } from "@/lib/payments";

/**
 * After payments change, set the invoice to paid when they cover the total,
 * or back to unpaid when they no longer do. An invoice marked paid by hand
 * with no payment records is left alone.
 */
export async function syncStatusFromPayments(client: SupabaseClient, invoiceId: string): Promise<"paid" | "unpaid" | null> {
  const { data: inv } = await client.from("invoices").select("total_cents, status, paid_at").eq("id", invoiceId).maybeSingle();
  if (!inv) return null;
  const { data: pays } = await client.from("invoice_payments").select("amount_cents, method, paid_on").eq("invoice_id", invoiceId);
  const payments = (pays ?? []) as { amount_cents: number; method: string; paid_on: string }[];
  if (!payments.length && inv.status === "paid") return "paid";
  const status = statusFromPayments(inv.total_cents, payments);
  if (status === inv.status) return status;
  const now = new Date().toISOString();
  const allCard = payments.length > 0 && payments.every((p) => p.method === "card");
  await client
    .from("invoices")
    .update(status === "paid" ? { status, paid_at: now, updated_at: now } : { status, paid_at: null, updated_at: now })
    .eq("id", invoiceId);
  // paid_via is server-only; keep "Paid by card" only when card paid all of it.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient().from("invoices").update({ paid_via: status === "paid" && allCard ? "card" : null }).eq("id", invoiceId);
  return status;
}
