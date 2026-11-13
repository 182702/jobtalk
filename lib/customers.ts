import type { SupabaseClient } from "@supabase/supabase-js";

export type Customer = { name: string; email: string };

/** Lowercase, single-spaced name, so "Maria  Lopez" and "maria lopez" match. */
export function customerKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The contractor's past customers, newest first, built from their invoices.
 * Each name keeps the most recent email it was used with.
 */
export async function loadCustomers(supabase: SupabaseClient, limit = 500): Promise<Customer[]> {
  const { data } = await supabase
    .from("invoices")
    .select("customer_name, customer_email")
    .order("created_at", { ascending: false })
    .limit(limit);
  const seen = new Map<string, Customer>();
  for (const row of (data ?? []) as { customer_name: string; customer_email: string }[]) {
    const name = row.customer_name?.trim();
    if (!name) continue;
    const key = customerKey(name);
    const found = seen.get(key);
    if (!found) seen.set(key, { name, email: row.customer_email ?? "" });
    else if (!found.email && row.customer_email) found.email = row.customer_email;
  }
  return [...seen.values()];
}

/** The saved email for a customer name, or "" when unknown. */
export function emailFor(customers: Customer[], name: string): string {
  const key = customerKey(name);
  return customers.find((c) => customerKey(c.name) === key)?.email ?? "";
}
