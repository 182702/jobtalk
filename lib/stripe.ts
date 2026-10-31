import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return client;
}

/** True when the configured key is a Stripe test/sandbox key (sk_test_ or rk_test_). */
export function stripeIsTestMode(): boolean {
  return /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}
