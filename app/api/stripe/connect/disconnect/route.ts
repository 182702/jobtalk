import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uiT } from "@/lib/ui-server";

/** Stops card payments. The Stripe account stays the contractor's; it's just no longer linked. */
export async function POST() {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const { error } = await createAdminClient().from("profiles").update({ stripe_account_id: null, card_payments_enabled: false }).eq("id", user.id);
  if (error) return NextResponse.json({ error: await uiT("Something went wrong. Try again.") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
