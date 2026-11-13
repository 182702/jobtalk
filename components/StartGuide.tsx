"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { saveSettings, type SettingsState } from "@/app/(app)/settings/actions";
import { setUiLang } from "@/components/LangSwitch";
import { bpsToPercentString, centsToDollarString } from "@/lib/money";
import type { Profile } from "@/lib/types";
import { translator, type UiLang } from "@/lib/ui";

const EXAMPLE: Record<UiLang, string> = {
  en: "Fixed a leaking kitchen faucet for Maria Lopez. 2 hours labor, new cartridge $35.",
  es: "Arreglé la llave de la cocina que goteaba para Maria Lopez. 2 horas de trabajo, cartucho nuevo $35.",
};

/** First-time setup: language, business basics, then how to make the first invoice. */
export function StartGuide({ profile, lang }: { profile: Profile; lang: UiLang }) {
  const T = translator(lang);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});

  useEffect(() => {
    if (state.ok) setStep(3);
  }, [state]);

  function pickLang(l: UiLang) {
    setUiLang(l);
    setStep(2);
    router.refresh();
  }

  return (
    <div className="start">
      <p className="stepCount">{T("Step {n} of 3", { n: step })}</p>

      {step === 1 && (
        <div className="card">
          <h1 style={{ marginTop: 0 }}>{T("Welcome to VoiceBill Pro 👋")}</h1>
          <p className="muted">{T("Let's get you ready in about a minute. First, pick your language.")}</p>
          <div className="bigChoices">
            <button type="button" className={lang === "en" ? "" : "alt"} onClick={() => pickLang("en")}>
              🇺🇸 English
            </button>
            <button type="button" className={lang === "es" ? "" : "alt"} onClick={() => pickLang("es")}>
              🇲🇽 Español
            </button>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>{T("You can change this any time in Settings.")}</p>
        </div>
      )}

      {step === 2 && (
        <form className="card" action={action}>
          <h1 style={{ marginTop: 0 }}>{T("Your business")}</h1>
          <p className="muted">{T("This goes on every invoice. You can change it later in Settings.")}</p>
          <div className="field">
            <label htmlFor="business_name">{T("Business name")}</label>
            <input id="business_name" name="business_name" defaultValue={profile.business_name} placeholder={`${T("e.g.")} Rivera Plumbing`} required />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="hourly_rate">{T("Your hourly rate ($)")}</label>
              <input
                id="hourly_rate"
                name="hourly_rate"
                inputMode="decimal"
                defaultValue={profile.hourly_rate_cents ? centsToDollarString(profile.hourly_rate_cents) : ""}
                placeholder={`${T("e.g.")} 85`}
              />
            </div>
            <div className="field">
              <label htmlFor="tax_rate">{T("Sales tax (%)")}</label>
              <input id="tax_rate" name="tax_rate" inputMode="decimal" defaultValue={profile.tax_rate_bps ? bpsToPercentString(profile.tax_rate_bps) : ""} placeholder={`${T("e.g.")} 8.25`} />
            </div>
          </div>
          <p className="muted small" style={{ marginTop: -4 }}>
            {T("If you say \"3 hours\" without a price, the app uses your hourly rate. Leave tax at 0 if you don't charge it.")}
          </p>
          <div className="field">
            <label htmlFor="payment_instructions">{T("How customers pay you")}</label>
            <textarea
              id="payment_instructions"
              name="payment_instructions"
              defaultValue={profile.payment_instructions}
              placeholder={`${T("e.g.")} ${T("Zelle or Venmo: 555-123-4567\nChecks payable to Rivera Plumbing LLC")}`}
              style={{ minHeight: 70 }}
            />
          </div>
          <div className="btns">
            <button type="button" className="alt" onClick={() => setStep(1)}>
              {T("Back")}
            </button>
            <button type="submit" disabled={pending}>
              {pending ? T("Saving…") : T("Save and continue")}
            </button>
          </div>
          {state.error && (
            <div className="err" role="alert">
              {state.error}
            </div>
          )}
        </form>
      )}

      {step === 3 && (
        <div className="card">
          <h1 style={{ marginTop: 0 }}>{T("You're ready ✅")}</h1>
          <p>{T("Here's how to make an invoice:")}</p>
          <ol className="steps">
            <li>{T("Tap + New.")}</li>
            <li>{T("Tap Speak and talk like you're telling a friend about the job: who it was for, what you did, hours and prices.")}</li>
            <li>{T("Tap Make invoice. Check it. Anything in red needs a price.")}</li>
            <li>{T("Save, then tap Email to customer.")}</li>
          </ol>
          <div className="hint">
            <b>{T("Example you can say:")}</b>
            <p style={{ margin: "6px 0 0" }}>
              <i>“{EXAMPLE[lang]}”</i>
            </p>
          </div>
          <p className="muted small">
            {T("Tip: add VoiceBill Pro to your home screen. In your browser menu, tap \"Add to Home screen\" or \"Install app\".")}
          </p>
          <div className="btns">
            <Link className="btn" href="/new" style={{ flex: 1, textAlign: "center" }}>
              {T("Make my first invoice")}
            </Link>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>
            <Link href="/invoices">{T("Skip for now")}</Link> · <Link href="/settings">{T("Add a logo in Settings")}</Link>
          </p>
        </div>
      )}
    </div>
  );
}
