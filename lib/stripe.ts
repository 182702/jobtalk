import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return client;
}
