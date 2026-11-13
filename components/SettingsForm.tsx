"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "@/app/(app)/settings/actions";
import { logoUrl } from "@/lib/invoice";
import { bpsToPercentString, centsToDollarString } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { translator, type UiLang } from "@/lib/ui";

export function SettingsForm({ profile, lang }: { profile: Profile; lang: UiLang }) {
  const T = translator(lang);
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const logo = logoUrl(profile.logo_path);

  return (
    <form className="card" action={action}>
      <h2>{T("Business")}</h2>
      <div className="field">
        <label htmlFor="business_name">{T("Business name")}</label>
        <input id="business_name" name="business_name" defaultValue={profile.business_name} placeholder={`${T("e.g.")} Rivera Plumbing`} />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="hourly_rate">{T("Default hourly rate ($)")}</label>
          <input id="hourly_rate" name="hourly_rate" inputMode="decimal" defaultValue={profile.hourly_rate_cents ? centsToDollarString(profile.hourly_rate_cents) : ""} placeholder={`${T("e.g.")} 85`} />
        </div>
        <div className="field">
          <label htmlFor="tax_rate">{T("Tax rate (%)")}</label>
          <input id="tax_rate" name="tax_rate" inputMode="decimal" defaultValue={profile.tax_rate_bps ? bpsToPercentString(profile.tax_rate_bps) : ""} placeholder={`${T("e.g.")} 8.25`} />
        </div>
      </div>
      <p className="muted small" style={{ marginTop: -4 }}>
        {T("The hourly rate is used when you mention hours without a rate. Tax is added on the subtotal as its own line.")}
      </p>
      <div className="field">
        <label htmlFor="payment_instructions">{T("Payment instructions")}</label>
        <textarea
          id="payment_instructions"
          name="payment_instructions"
          defaultValue={profile.payment_instructions}
          placeholder={`${T("e.g.")} ${T("Zelle or Venmo: 555-123-4567\nChecks payable to Rivera Plumbing LLC")}`}
          style={{ minHeight: 80 }}
        />
      </div>
      <div className="field">
        <label htmlFor="logo">{T("Logo (PNG or JPG, under 1 MB)")}</label>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={T("Current logo")} style={{ maxHeight: 56, maxWidth: 160, display: "block", marginBottom: 8 }} />
        )}
        <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" />
        {logo && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input type="checkbox" name="remove_logo" style={{ width: "auto" }} /> {T("Remove logo")}
          </label>
        )}
      </div>
      <div className="btns">
        <button type="submit" disabled={pending}>
          {pending ? T("Saving…") : T("Save settings")}
        </button>
      </div>
      {state.error && <div className="err" role="alert">{state.error}</div>}
      {state.ok && <div className="okmsg">{T("Saved.")}</div>}
    </form>
  );
}

export function PasswordForm({ lang }: { lang: UiLang }) {
  const T = translator(lang);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.updateUser({ password });
    setMsg(error ? { err: error.message } : { ok: T("Password updated.") });
    if (!error) setPassword("");
  }

  return (
    <form className="card" id="password" onSubmit={submit}>
      <h2>{T("Password")}</h2>
      <div className="field">
        <label htmlFor="new-password">{T("New password")}</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="alt">{T("Change password")}</button>
      {msg.err && <div className="err">{msg.err}</div>}
      {msg.ok && <div className="okmsg">{msg.ok}</div>}
    </form>
  );
}
