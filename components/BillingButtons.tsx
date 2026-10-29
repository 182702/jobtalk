"use client";

import { useState } from "react";

export function BillingButton({ action, label }: { action: "checkout" | "portal"; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/stripe/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message || "Billing is unavailable right now.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={action === "portal" ? "alt" : ""} onClick={go} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Opening…" : label}
      </button>
      {error && <div className="err">{error}</div>}
    </>
  );
}
