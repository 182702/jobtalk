import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sends the contractor to Stripe to connect (or finish setting up) their own
 * Stripe account. Also Stripe's refresh_url, so it must be a GET.
 */
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/settings`);
  const { data: profile } = await supabase.from("profiles").select("id, email, business_name, stripe_account_id").eq("id", user.id).single();
  if (!profile) return NextResponse.redirect(`${appUrl()}/settings?stripe=error#card-payments`);

  try {
    let account = profile.stripe_account_id as string | null;
    if (!account) {
      const created = await stripe().accounts.create({
        type: "standard",
        email: profile.email,
        business_profile: profile.business_name ? { name: profile.business_name } : undefined,
        metadata: { user_id: user.id },
      });
      account = created.id;
      const { error } = await createAdminClient().from("profiles").update({ stripe_account_id: account }).eq("id", user.id);
      if (error) throw error;
    }
    const link = await stripe().accountLinks.create({
      account,
      type: "account_onboarding",
      refresh_url: `${appUrl()}/api/stripe/connect`,
      return_url: `${appUrl()}/settings?stripe=done#card-payments`,
    });
    return NextResponse.redirect(link.url);
  } catch (err) {
    console.error("stripe connect failed", err);
    // Show Stripe's own reason to the account owner, so setup problems are easy to fix.
    const reason = err instanceof Error ? err.message.slice(0, 300) : "";
    return NextResponse.redirect(`${appUrl()}/settings?stripe=error&reason=${encodeURIComponent(reason)}#card-payments`);
  }
}
