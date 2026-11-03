import { BillingButton } from "@/components/BillingButtons";
import { LocalTime } from "@/components/LocalTime";
import { requireProfile } from "@/lib/auth";
import { SOLO_PRICE_LABEL } from "@/lib/plans";
import { stripe, stripeIsTestMode } from "@/lib/stripe";
import { getUsage } from "@/lib/usage";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

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
  const lang = await getUiLang();
  const T = translator(lang);

  return (
    <main>
      <h1>{T("Billing")}</h1>
      {stripeIsTestMode() && (
        <div className="warn">{T("Stripe is in test mode. Payments use test cards only and no real money is charged.")}</div>
      )}
      {canceled && <div className="card">{T("Your subscription is canceled. You keep Solo until the end of the period you paid for.")}</div>}
      {success && usage.plan !== "solo" && (
        <div className="card">{T("Thanks! Your payment is processing. This page updates within a minute; refresh to check.")}</div>
      )}
      <div className="card">
        <h2>{usage.plan === "solo" ? T("Solo plan") : T("Free plan")}</h2>
        {usage.plan === "solo" ? (
          <p className="muted">
            {T("Unlimited job notes.")} {sub?.status && sub.status !== "active" ? T("Status: {status}.", { status: sub.status }) + " " : ""}
            {cancelsOn ? (
              <>
                {T("Canceled: your plan stays active until")} <LocalTime iso={cancelsOn.toISOString()} dateOnly lang={lang} />
                {T(", then switches to Free. You won't be charged again.")}
              </>
            ) : sub?.current_period_end ? (
              <>
                {T("Renews")} <LocalTime iso={sub.current_period_end} dateOnly lang={lang} />.
              </>
            ) : null}
          </p>
        ) : (
          <p className="muted">
            {T("{used} of {limit} job notes used this month. Resets on the 1st.", { used: usage.used, limit: usage.limit })}
          </p>
        )}
        {usage.plan === "solo" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <BillingButton action="portal" label={cancelsOn ? T("Keep my plan") : T("Update card or view receipts")} lang={lang} />
            {!cancelsOn && <BillingButton action="cancel" label={T("Cancel subscription")} lang={lang} />}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <BillingButton action="checkout" label={T("Upgrade to Solo · {price}", { price: lang === "es" ? "$24/mes" : SOLO_PRICE_LABEL })} lang={lang} />
            {sub?.stripe_subscription_id && <BillingButton action="portal" label={T("View past receipts")} lang={lang} />}
          </div>
        )}
      </div>
      <div className="card">
        <h2>{T("Plans")}</h2>
        <p style={{ margin: "0 0 6px" }}>
          <b>{T("Free")}</b> · {T("5 job notes a month")}
        </p>
        <p style={{ margin: 0 }}>
          <b>Solo</b> · {T("{price}, unlimited job notes. Cancel any time.", { price: lang === "es" ? "$24/mes" : SOLO_PRICE_LABEL })}
        </p>
      </div>
    </main>
  );
}
