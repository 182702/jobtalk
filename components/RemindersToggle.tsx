"use client";

import { useState, useTransition } from "react";
import { setReminders } from "@/app/(app)/settings/actions";
import { translator, type UiLang } from "@/lib/ui";

/** Settings card: automatic payment reminders on or off. */
export function RemindersToggle({ initial, lang }: { initial: boolean; lang: UiLang }) {
  const T = translator(lang);
  const [on, setOn] = useState(initial);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setMsg({});
    start(async () => {
      const res = await setReminders(next);
      if (res.error) return setMsg({ err: res.error });
      setOn(next);
      setMsg({ ok: next ? T("Reminders are on.") : T("Reminders are off.") });
    });
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{T("Automatic payment reminders")}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={T("Automatic payment reminders")}
          className={`switch${on ? " on" : ""}`}
          onClick={toggle}
          disabled={pending}
        >
          <span />
        </button>
      </div>
      <p className="muted small" style={{ marginBottom: 0 }}>
        {T(
          "If an invoice you emailed is still unpaid, VoiceBill Pro sends your customer a polite reminder 3, 7 and 14 days later. It stops as soon as you mark the invoice paid, and you can stop it for any invoice.",
        )}
      </p>
      {msg.err && <div className="err">{msg.err}</div>}
      {msg.ok && <div className="okmsg">{msg.ok}</div>}
    </div>
  );
}
