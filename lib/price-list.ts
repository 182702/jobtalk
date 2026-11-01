import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LineItem } from "@/lib/types";

export type SavedPrice = { id: number; name: string; rate_cents: number; last_used_at: string };

/** Lowercase, single-spaced key so "Shutoff  Valve" and "shutoff valve" are one entry. */
export function priceKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

/** The contractor's saved prices, most recently used first. Empty if the table doesn't exist yet. */
export async function loadPriceList(supabase: SupabaseClient, limit = 150): Promise<SavedPrice[]> {
  const { data, error } = await supabase
    .from("price_list")
    .select("id, name, rate_cents, last_used_at")
    .order("last_used_at", { ascending: false })
    .limit(limit);
  return error ? [] : ((data ?? []) as SavedPrice[]);
}

/** Saves the unit price of every priced line. Best effort: never blocks saving the invoice. */
export async function rememberPrices(supabase: SupabaseClient, userId: string, items: LineItem[]) {
  const rows = new Map<string, { user_id: string; name: string; name_key: string; rate_cents: number; last_used_at: string }>();
  const now = new Date().toISOString();
  for (const it of items) {
    const name = it.description.trim().slice(0, 200);
    if (!name || !(it.rate_cents > 0)) continue;
    rows.set(priceKey(name), { user_id: userId, name, name_key: priceKey(name), rate_cents: Math.round(it.rate_cents), last_used_at: now });
  }
  if (!rows.size) return;
  const { error } = await supabase.from("price_list").upsert([...rows.values()], { onConflict: "user_id,name_key" });
  if (error && error.code !== "42P01") console.error("remember prices failed", error); // 42P01: migration not run yet
}
