import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUser } from "@/lib/auth";
import { appUrl, requireEnv } from "@/lib/env";
import { SOLO_TRIAL_DAYS } from "@/lib/plans";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/** Returns the stored customer if it still exists in this Stripe mode, else null. */
async function existingCustomer(customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;
  try {
    const customer = await stripe().customers.retrieve(customerId);
    return customer.deleted ? null : customer.id;
  } catch (err) {
    // A customer created in test mode doesn't exist in live mode (and vice versa).
    if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing") return null;
    throw err;
  }
}

/** True if this customer has never had a subscription, so they get the free trial. */
async function firstSubscription(customerId: string, storedSubscriptionId: string | null | undefined): Promise<boolean> {
  if (storedSubscriptionId) return false;
  const past = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 1 });
  return past.data.length === 0;
}

/** Starts a Stripe Checkout session for the Solo plan. */
export async function POST() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data: sub } = await supabase.from("subscriptions").select("plan, stripe_customer_id, stripe_subscription_id").eq("user_id", user.id).maybeSingle();
  if (sub?.plan === "solo") return NextResponse.json({ url: `${appUrl()}/billing` });

  try {
    let customerId = await existingCustomer(sub?.stripe_customer_id);
    if (!customerId) {
      const customer = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await createAdminClient()
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() });
    }

    const trial = await firstSubscription(customerId, sub?.stripe_subscription_id);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: requireEnv("STRIPE_PRICE_SOLO"), quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id },
        ...(trial ? { trial_period_days: SOLO_TRIAL_DAYS } : {}),
      },
      success_url: `${appUrl()}/billing?success=1`,
      cancel_url: `${appUrl()}/billing`,
      allow_promotion_codes: true,
      custom_text: {
        submit: { message: "Unlimited job notes. Cancel any time from Billing in VoiceBill Pro. Questions? support@voicebillpro.com" },
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout failed", err);
    return NextResponse.json({ error: "Checkout is unavailable right now. Try again in a moment." }, { status: 502 });
  }
}
