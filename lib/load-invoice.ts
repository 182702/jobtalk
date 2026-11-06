import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeItems } from "@/lib/invoice";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceWithItems, Profile, Signature } from "@/lib/types";

const SELECT = "*, line_items(description, quantity, rate_cents, position)";

type Row = Omit<InvoiceWithItems, "line_items"> & {
  user_id: string;
  line_items: { description: string; quantity: number | string; rate_cents: number; position: number }[];
};

function toInvoice(row: Row): InvoiceWithItems {
  const items = [...row.line_items].sort((a, b) => a.position - b.position);
  return { ...row, line_items: normalizeItems(items) };
}

/** Signatures in a fixed order (approve, then complete). Empty if the 0006 migration hasn't run. */
async function loadSignatures(client: SupabaseClient, invoiceId: string): Promise<Signature[]> {
  const { data, error } = await client
    .from("invoice_signatures")
    .select("kind, signer_name, image, total_cents, signed_on")
    .eq("invoice_id", invoiceId);
  if (error || !data) return [];
  return (data as Signature[]).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "approve" ? -1 : 1));
}

/** Loads one of the signed-in user's invoices (RLS restricts to the owner). */
export async function loadInvoice(supabase: SupabaseClient, id: string): Promise<InvoiceWithItems | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase.from("invoices").select(SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  return { ...toInvoice(data as Row), signatures: await loadSignatures(supabase, id) };
}

/** Loads an invoice and its owner's profile by the customer link token. */
export async function loadPublicInvoice(token: string): Promise<{ invoice: InvoiceWithItems; profile: Profile } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("invoices").select(SELECT).eq("public_token", token).maybeSingle();
  if (!data) return null;
  const invoice = { ...toInvoice(data as Row), signatures: await loadSignatures(admin, (data as Row).id) };
  const { data: profile } = await admin.from("profiles").select("*").eq("id", (data as Row).user_id).single();
  if (!profile) return null;
  return { invoice, profile: profile as Profile };
}
