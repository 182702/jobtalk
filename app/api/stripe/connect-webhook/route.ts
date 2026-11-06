import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { recordCardPayment } from "@/lib/card-payments";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe Connect webhook: events from contractors' connected accounts.
 * Set up in Stripe as an endpoint that listens to "Connected accounts", with
 * its signing secret in STRIPE_CONNECT_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const account = event.account;
  if (!account) return NextResponse.json({ received: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await recordCardPayment(event.data.object, account);
        break;
      case "account.updated": {
        const acct = event.data.object;
        await createAdminClient().from("profiles").update({ card_payments_enabled: acct.charges_enabled === true }).eq("stripe_account_id", acct.id);
        break;
      }
    }
  } catch (err) {
    console.error("connect webhook failed", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
