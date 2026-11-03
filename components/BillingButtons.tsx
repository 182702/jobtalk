"use client";

import { useState } from "react";
import { translator, type UiLang } from "@/lib/ui";

type Action = "checkout" | "portal" | "cancel";

export function BillingButton({ action, label, lang }: { action: Action; label: string; lang: UiLang }) {
  const T = translator(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/stripe/${action === "checkout" ? "checkout" : "portal"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "cancel" ? { flow: "cancel" } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || T("Billing is unavailable right now."));
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const className = action === "checkout" ? "" : action === "cancel" ? "danger" : "alt";
  return (
    <>
      <button type="button" className={className} onClick={go} disabled={busy} style={{ width: "100%" }}>
        {busy ? T("Opening…") : label}
      </button>
      {error && <div className="err">{error}</div>}
    </>
  );
}
