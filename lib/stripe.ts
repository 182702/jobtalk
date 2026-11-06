import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let client: Stripe | null = null;
export function stripe() {
  // STRIPE_API_HOST (e.g. "127.0.0.1:12111") points at a local mock for testing; never set it in production.
  const mock = process.env.STRIPE_API_HOST?.split(":");
  client ??= new Stripe(
    requireEnv("STRIPE_SECRET_KEY"),
    mock ? { host: mock[0], port: Number(mock[1] || 80), protocol: "http" } : undefined,
  );
  return client;
}

/** True when the configured key is a Stripe test/sandbox key (sk_test_ or rk_test_). */
export function stripeIsTestMode(): boolean {
  return /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}
