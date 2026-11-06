"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { translator, type UiLang } from "@/lib/ui";

export type CardStatus = "none" | "setup" | "review" | "ready" | "error";

/** Settings card: connect Stripe so customers can pay invoices by card. */
export function CardPayments({ status, feeBps, lang, notice }: { status: CardStatus; feeBps: number; lang: UiLang; notice?: "error" }) {
  const T = translator(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(notice === "error" ? T("Couldn't connect to Stripe. Try again in a moment.") : "");

  async function disconnect() {
    if (!window.confirm(T("Stop taking card payments? Your Stripe account stays yours; it just won't be linked to VoiceBill Pro."))) return;
    setBusy(true);
    const res = await fetch("/api/stripe/connect/disconnect", { method: "POST" });
    setBusy(false);
    if (!res.ok) return setError(T("Something went wrong. Try again."));
    router.refresh();
  }

  return (
    <div className="card" id="card-payments">
      <h2 style={{ marginTop: 0 }}>{T("Card payments")}</h2>
      {status === "ready" ? (
        <p className="okmsg" style={{ marginTop: 0 }}>{T("✓ Accepting card payments. A Pay by card button now shows on your invoice links.")}</p>
      ) : status === "review" ? (
        <p style={{ marginTop: 0 }}>{T("Stripe is reviewing your details. This usually takes a few minutes, sometimes a day or two.")}</p>
      ) : status === "setup" ? (
        <p style={{ marginTop: 0 }}>{T("You started connecting Stripe. Finish setup to start taking cards.")}</p>
      ) : (
        <p style={{ marginTop: 0 }}>{T("Let customers pay your invoices by card. The money goes straight to your own Stripe account, then to your bank.")}</p>
      )}
      <p className="muted small">
        {feeBps > 0
          ? T("Stripe's card fee and a {fee}% VoiceBill Pro fee come out of each payment.", { fee: (feeBps / 100).toString() })
          : T("Stripe takes its card fee from each payment (in the US, usually 2.9% + 30¢; see stripe.com/pricing). VoiceBill Pro adds no fee.")}
      </p>
      <div className="btns">
        {status === "ready" ? (
          <>
            <a className="btn alt" href="https://dashboard.stripe.com" target="_blank" rel="noopener">
              {T("Open Stripe")}
            </a>
            <button type="button" className="alt" onClick={disconnect} disabled={busy}>
              {T("Disconnect")}
            </button>
          </>
        ) : (
          <a className="btn" href="/api/stripe/connect">
            {status === "none" || status === "error" ? T("Connect Stripe") : status === "setup" ? T("Finish Stripe setup") : T("Check with Stripe")}
          </a>
        )}
      </div>
      {error && <div className="err">{error}</div>}
    </div>
  );
}
