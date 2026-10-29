"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "@/app/settings/actions";
import { logoUrl } from "@/lib/invoice";
import { bpsToPercentString, centsToDollarString } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const logo = logoUrl(profile.logo_path);

  return (
    <form className="card" action={action}>
      <h2>Business</h2>
      <div className="field">
        <label htmlFor="business_name">Business name</label>
        <input id="business_name" name="business_name" defaultValue={profile.business_name} placeholder="Rivera Plumbing" />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="hourly_rate">Default hourly rate ($)</label>
          <input id="hourly_rate" name="hourly_rate" inputMode="decimal" defaultValue={profile.hourly_rate_cents ? centsToDollarString(profile.hourly_rate_cents) : ""} placeholder="85" />
        </div>
        <div className="field">
          <label htmlFor="tax_rate">Tax rate (%)</label>
          <input id="tax_rate" name="tax_rate" inputMode="decimal" defaultValue={profile.tax_rate_bps ? bpsToPercentString(profile.tax_rate_bps) : ""} placeholder="8.25" />
        </div>
      </div>
      <p className="muted small" style={{ marginTop: -4 }}>
        The hourly rate is used when you mention hours without a rate. Tax is added on the subtotal as its own line.
      </p>
      <div className="field">
        <label htmlFor="payment_instructions">Payment instructions</label>
        <textarea
          id="payment_instructions"
          name="payment_instructions"
          defaultValue={profile.payment_instructions}
          placeholder={"Zelle or Venmo: 555-123-4567\nChecks payable to Rivera Plumbing LLC"}
          style={{ minHeight: 80 }}
        />
      </div>
      <div className="field">
        <label htmlFor="logo">Logo (PNG or JPG, under 1 MB)</label>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Current logo" style={{ maxHeight: 56, maxWidth: 160, display: "block", marginBottom: 8 }} />
        )}
        <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" />
        {logo && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input type="checkbox" name="remove_logo" style={{ width: "auto" }} /> Remove logo
          </label>
        )}
      </div>
      <div className="btns">
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
      {state.error && <div className="err" role="alert">{state.error}</div>}
      {state.ok && <div className="okmsg">Saved.</div>}
    </form>
  );
}

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.updateUser({ password });
    setMsg(error ? { err: error.message } : { ok: "Password updated." });
    if (!error) setPassword("");
  }

  return (
    <form className="card" id="password" onSubmit={submit}>
      <h2>Password</h2>
      <div className="field">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="alt">Change password</button>
      {msg.err && <div className="err">{msg.err}</div>}
      {msg.ok && <div className="okmsg">{msg.ok}</div>}
    </form>
  );
}
