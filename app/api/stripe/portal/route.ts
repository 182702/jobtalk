import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe";

/**
 * Opens the Stripe customer portal to change card, see receipts or cancel.
 * Body {"flow": "cancel"} opens it straight on the cancellation screen.
 */
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { flow } = (await request.json().catch(() => ({}))) as { flow?: string };
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  const params: Stripe.BillingPortal.SessionCreateParams = {
    customer: sub.stripe_customer_id,
    return_url: `${appUrl()}/billing`,
  };
  if (flow === "cancel" && sub.stripe_subscription_id) {
    params.flow_data = {
      type: "subscription_cancel",
      subscription_cancel: { subscription: sub.stripe_subscription_id },
      after_completion: { type: "redirect", redirect: { return_url: `${appUrl()}/billing?canceled=1` } },
    };
  }

  try {
    const session = await stripe().billingPortal.sessions.create(params);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("portal failed", err);
    return NextResponse.json({ error: "Billing management is unavailable right now. Try again in a moment." }, { status: 502 });
  }
}
