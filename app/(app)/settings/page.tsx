import Link from "next/link";
import { SavedPrices } from "@/components/SavedPrices";
import { PasswordForm, SettingsForm } from "@/components/SettingsForm";
import { requireProfile } from "@/lib/auth";
import { loadPriceList } from "@/lib/price-list";
import { LangSwitch } from "@/components/LangSwitch";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
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
