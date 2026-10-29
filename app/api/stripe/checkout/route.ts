import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { appUrl, requireEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/** Starts a Stripe Checkout session for the Solo plan. */
export async function POST() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data: sub } = await supabase.from("subscriptions").select("plan, stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (sub?.plan === "solo") return NextResponse.json({ url: `${appUrl()}/billing` });

  let customerId = sub?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await createAdminClient()
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: requireEnv("STRIPE_PRICE_SOLO"), quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${appUrl()}/billing?success=1`,
    cancel_url: `${appUrl()}/billing`,
    allow_promotion_codes: true,
  });
  return NextResponse.json({ url: session.url });
}
