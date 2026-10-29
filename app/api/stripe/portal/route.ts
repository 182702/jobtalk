import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe";

/** Opens the Stripe customer portal to change card or cancel. */
export async function POST() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl()}/billing`,
  });
  return NextResponse.json({ url: session.url });
}
