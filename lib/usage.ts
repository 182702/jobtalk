import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlan } from "@/lib/auth";
import { FREE_NOTES_PER_MONTH } from "@/lib/plans";

export async function getUsage(supabase: SupabaseClient, userId: string) {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const [plan, { data }] = await Promise.all([
    getPlan(supabase as never, userId),
    supabase.from("usage").select("notes_used").eq("user_id", userId).eq("month", month).maybeSingle(),
  ]);
  return { plan, used: data?.notes_used ?? 0, limit: FREE_NOTES_PER_MONTH };
}
