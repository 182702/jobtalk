"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEAD_SOURCES, LEAD_STAGES, STAGE_LABEL, ymd, type Lead, type LeadStage } from "@/lib/leads";
import { centsToDollarString, parseDollarsToCents } from "@/lib/money";
import { translator, type UiLang } from "@/lib/ui";

type Props = { uiLang: UiLang; lead?: Lead; onDone?: () => void };

/** Add a lead, or edit one (when `lead` is given). */
export function LeadForm({ uiLang, lead, onDone }: Props) {
  const T = translator(uiLang);
  const router = useRouter();
  const [f, setF] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    address: lead?.address ?? "",
    job: lead?.job ?? "",
    source: lead?.source ?? "",
    value: lead && lead.value_cents > 0 ? centsToDollarString(lead.value_cents) : "",
    stage: (lead?.stage ?? "new") as LeadStage,
    follow_up_on: lead ? (lead.follow_up_on ?? "") : ymd(new Date(), 1),
    notes: lead?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError(T("Add the customer's name."));
    const value_cents = f.value.trim() ? parseDollarsToCents(f.value) : 0;
    if (!(value_cents >= 0)) return setError(T("Check the job value."));
    setBusy(true);
    const body = {
      name: f.name,
      phone: f.phone,
      email: f.email.trim(),
      address: f.address,
      job: f.job,
      source: f.source,
      value_cents,
      stage: f.stage,
      follow_up_on: f.follow_up_on || null,
      notes: f.notes,
    };
    const res = await fetch(lead ? `/api/leads/${lead.id}` : "/api/leads", {
      method: lead ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || T("Something went wrong. Try again."));
    if (lead) {
      router.refresh();
      onDone?.();
    } else router.push(`/leads/${data.id}`);
  }

  return (
    <form className="card" onSubmit={save}>
      <div className="field">
        <label htmlFor="lname">{T("Name")} *</label>
        <input id="lname" value={f.name} onChange={set("name")} maxLength={120} placeholder={T("e.g. Maria Lopez")} autoComplete="off" />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="lphone">{T("Phone")}</label>
          <input id="lphone" type="tel" value={f.phone} onChange={set("phone")} maxLength={40} placeholder="(479) 555-0101" />
        </div>
        <div className="field">
          <label htmlFor="lemail">{T("Email")}</label>
          <input id="lemail" type="email" value={f.email} onChange={set("email")} maxLength={200} placeholder={T("optional")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ljob">{T("What job?")}</label>
        <input id="ljob" value={f.job} onChange={set("job")} maxLength={300} placeholder={T("e.g. water heater replacement")} />
      </div>
      <div className="field">
        <label htmlFor="laddr">{T("Address")}</label>
        <input id="laddr" value={f.address} onChange={set("address")} maxLength={200} placeholder={T("optional")} />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="lvalue">{T("Job value ($)")}</label>
          <input id="lvalue" inputMode="decimal" value={f.value} onChange={set("value")} placeholder={T("optional")} />
        </div>
        <div className="field">
          <label htmlFor="lsource">{T("Where did they find you?")}</label>
          <select id="lsource" value={f.source} onChange={set("source")}>
            <option value="">—</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {T(s)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="lstage">{T("Stage")}</label>
          <select id="lstage" value={f.stage} onChange={set("stage")}>
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {T(STAGE_LABEL[s])}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lfollow">{T("Follow up on")}</label>
          <input id="lfollow" type="date" value={f.follow_up_on} onChange={set("follow_up_on")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lnotes">{T("Notes")}</label>
        <textarea id="lnotes" value={f.notes} onChange={set("notes")} maxLength={4000} style={{ minHeight: 80 }} placeholder={T("e.g. Prefers texts. Gate code 1234.")} />
      </div>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
      <div className="row" style={{ marginTop: 4 }}>
        <button type="submit" disabled={busy}>
          {busy ? T("Saving…") : lead ? T("Save changes") : T("Save lead")}
        </button>
        {onDone && (
          <button type="button" className="alt" onClick={onDone}>
            {T("Cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
