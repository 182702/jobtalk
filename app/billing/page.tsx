import { BillingButton } from "@/components/BillingButtons";
import { requireProfile } from "@/lib/auth";
import { SOLO_PRICE_LABEL, SOLO_TRIAL_DAYS } from "@/lib/plans";
import { stripe, stripeIsTestMode } from "@/lib/stripe";
import { getUsage } from "@/lib/usage";

export const metadata = { title: "Billing" };

/** When an active subscription is set to end, returns that date; otherwise null. */
async function endingOn(subscriptionId: string | null | undefined): Promise<Date | null> {
  if (!subscriptionId) return null;
  try {
    const sub = await stripe().subscriptions.retrieve(subscriptionId);
    if (sub.status === "canceled") return null;
    const end = sub.cancel_at ?? (sub.cancel_at_period_end ? sub.items.data[0]?.current_period_end : null);
    return end ? new Date(end * 1000) : null;
  } catch {
    return null; // Billing page still works if Stripe is unreachable.
  }
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string; canceled?: string }> }) {
  const { success, canceled } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const usage = await getUsage(supabase, profile.id);
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", profile.id)
    .maybeSingle();
  const cancelsOn = usage.plan === "solo" ? await endingOn(sub?.stripe_subscription_id) : null;

  return (
    <main>
      <h1>Billing</h1>
      {stripeIsTestMode() && (
        <div className="warn">Stripe is in test mode. Payments use test cards only and no real money is charged.</div>
      )}
      {canceled && <div className="card">Your subscription is canceled. You keep Solo until the end of the period you paid for.</div>}
      {success && usage.plan !== "solo" && (
        <div className="card">Thanks! Your payment is processing. This page updates within a minute; refresh to check.</div>
      )}
      <div className="card">
        <h2>{usage.plan === "solo" ? "Solo plan" : "Free plan"}</h2>
        {usage.plan === "solo" ? (
          <p className="muted">
            Unlimited job notes. {sub?.status && !["active", "trialing"].includes(sub.status) ? `Status: ${sub.status}. ` : ""}
            {cancelsOn
              ? `Canceled: your plan stays active until ${cancelsOn.toLocaleDateString()}, then switches to Free. You won't be charged again.`
              : sub?.status === "trialing" && sub.current_period_end
                ? `Free trial until ${new Date(sub.current_period_end).toLocaleDateString()}, then ${SOLO_PRICE_LABEL}. Cancel before then and you won't be charged.`
                : sub?.current_period_end
                  ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}.`
                  : ""}
          </p>
        ) : (
          <p className="muted">
            {usage.used} of {usage.limit} job notes used this month. Resets on the 1st.
          </p>
        )}
        {usage.plan === "solo" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <BillingButton action="portal" label={cancelsOn ? "Keep my plan" : "Update card or view receipts"} />
            {!cancelsOn && <BillingButton action="cancel" label="Cancel subscription" />}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <BillingButton
              action="checkout"
              label={sub?.stripe_subscription_id ? `Upgrade to Solo · ${SOLO_PRICE_LABEL}` : `Start ${SOLO_TRIAL_DAYS}-day free trial of Solo`}
            />
            {!sub?.stripe_subscription_id && (
              <p className="muted small" style={{ margin: 0, textAlign: "center" }}>
                Then {SOLO_PRICE_LABEL}. You won&apos;t be charged if you cancel during the trial.
              </p>
            )}
            {sub?.stripe_subscription_id && <BillingButton action="portal" label="View past receipts" />}
          </div>
        )}
      </div>
      <div className="card">
        <h2>Plans</h2>
        <p style={{ margin: "0 0 6px" }}>
          <b>Free</b> · 5 job notes a month
        </p>
        <p style={{ margin: 0 }}>
          <b>Solo</b> · {SOLO_PRICE_LABEL}, unlimited job notes. {SOLO_TRIAL_DAYS}-day free trial the first time. Cancel any time.
        </p>
      </div>
    </main>
  );
}
