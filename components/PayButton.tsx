"use client";

import { useState } from "react";

/** "Pay $X by card" on the customer's invoice link. Wording comes from the server in the invoice's language. */
export function PayButton({ token, label, errorText }: { token: string; label: string; errorText: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/pay/${token}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || errorText);
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="noprint" style={{ margin: "14px 0" }}>
      <button type="button" className="payBtn" onClick={pay} disabled={busy}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
        {busy ? "…" : label}
      </button>
      <p className="muted small" style={{ textAlign: "center", margin: "6px 0 0" }}>🔒 Stripe</p>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
