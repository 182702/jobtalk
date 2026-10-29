import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** For pages: returns the user and profile, or redirects to login. */
export async function requireProfile(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; profile: Profile }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  return { supabase, profile: profile as Profile };
}

/** For route handlers: returns the user or null (caller responds 401). */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getPlan(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("subscriptions").select("plan, status").eq("user_id", userId).maybeSingle();
  return (data?.plan === "solo" ? "solo" : "free") as "free" | "solo";
}
