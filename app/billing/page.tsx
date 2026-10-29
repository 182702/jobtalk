import { BillingButton } from "@/components/BillingButtons";
import { requireProfile } from "@/lib/auth";
import { SOLO_PRICE_LABEL } from "@/lib/plans";
import { getUsage } from "@/lib/usage";

export const metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const { success } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const usage = await getUsage(supabase, profile.id);
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, stripe_customer_id")
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <main>
      <h1>Billing</h1>
      {success && usage.plan !== "solo" && (
        <div className="card">Thanks! Your payment is processing. This page updates within a minute; refresh to check.</div>
      )}
      <div className="card">
        <h2>{usage.plan === "solo" ? "Solo plan" : "Free plan"}</h2>
        {usage.plan === "solo" ? (
          <p className="muted">
            Unlimited job notes. {sub?.status && sub.status !== "active" ? `Status: ${sub.status}. ` : ""}
            {sub?.current_period_end ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}.` : ""}
          </p>
        ) : (
          <p className="muted">
            {usage.used} of {usage.limit} job notes used this month. Resets on the 1st.
          </p>
        )}
        {usage.plan === "solo" || sub?.stripe_customer_id ? (
          <div style={{ marginBottom: usage.plan === "solo" ? 0 : 10 }}>
            <BillingButton action="portal" label="Manage subscription" />
          </div>
        ) : null}
        {usage.plan !== "solo" && <BillingButton action="checkout" label={`Upgrade to Solo · ${SOLO_PRICE_LABEL}`} />}
      </div>
      <div className="card">
        <h2>Plans</h2>
        <p style={{ margin: "0 0 6px" }}>
          <b>Free</b> · 5 job notes a month
        </p>
        <p style={{ margin: 0 }}>
          <b>Solo</b> · {SOLO_PRICE_LABEL}, unlimited job notes. Cancel any time.
        </p>
      </div>
    </main>
  );
}
