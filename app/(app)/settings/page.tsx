import Link from "next/link";
import { SavedPrices } from "@/components/SavedPrices";
import { PasswordForm, SettingsForm } from "@/components/SettingsForm";
import { requireProfile } from "@/lib/auth";
import { loadPriceList } from "@/lib/price-list";
import { LangSwitch } from "@/components/LangSwitch";
import { CardPayments, type CardStatus } from "@/components/CardPayments";
import { RemindersToggle } from "@/components/RemindersToggle";
import { platformFeeBps } from "@/lib/card-payments";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Settings" };

/** Asks Stripe how far the contractor's account setup got, and caches whether it can take cards. */
async function cardStatus(profile: { id: string; stripe_account_id?: string | null; card_payments_enabled?: boolean }): Promise<CardStatus> {
  if (!profile.stripe_account_id) return "none";
  try {
    const acct = await stripe().accounts.retrieve(profile.stripe_account_id);
    const enabled = acct.charges_enabled === true;
    if (enabled !== (profile.card_payments_enabled === true)) {
      await createAdminClient().from("profiles").update({ card_payments_enabled: enabled }).eq("id", profile.id);
    }
    return enabled ? "ready" : acct.details_submitted ? "review" : "setup";
  } catch (err) {
    console.error("stripe account check failed", err);
    return profile.card_payments_enabled ? "ready" : "error";
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ stripe?: string; reason?: string }> }) {
  const { stripe: stripeParam, reason } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const prices = await loadPriceList(supabase, 300);
  const lang = await getUiLang();
  const T = translator(lang);
  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1>{T("Settings")}</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" className="alt small">{T("Log out")}</button>
        </form>
      </div>
      <p className="sub">{profile.email}</p>
      <div className="card">
        <h2>{T("App language")}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>{T("Menus and buttons. Each invoice has its own language for your customer.")}</p>
        <LangSwitch lang={lang} className="big" />
      </div>
      <SettingsForm profile={profile} lang={lang} />
      {profile.card_payments_enabled !== undefined && (
        <CardPayments status={await cardStatus(profile)} feeBps={platformFeeBps()} lang={lang} notice={stripeParam === "error" ? "error" : undefined} reason={stripeParam === "error" ? reason?.slice(0, 300) : undefined} />
      )}
      <RemindersToggle initial={profile.reminders_enabled === true} lang={lang} />
      <SavedPrices initial={prices.map(({ id, name, rate_cents }) => ({ id, name, rate_cents }))} lang={lang} />
      <div className="card">
        <h2>{T("Plan")}</h2>
        <p className="muted" style={{ margin: "0 0 10px" }}>{T("See usage, upgrade, update your card, or cancel your subscription.")}</p>
        <Link className="btn alt" href="/billing">{T("Billing & cancel subscription")}</Link>
      </div>
      <p className="muted small">
        <Link href="/start">{T("Open the setup guide again")}</Link>
      </p>
      <PasswordForm lang={lang} />
      <form action="/auth/signout" method="post">
        <button type="submit" className="alt" style={{ width: "100%" }}>{T("Log out")}</button>
      </form>
    </main>
  );
}
