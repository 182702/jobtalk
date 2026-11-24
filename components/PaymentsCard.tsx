"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { centsToDollarString, formatCents, parseDollarsToCents } from "@/lib/money";
import { formatDate } from "@/lib/invoice";
import { balanceCents, paidCents, PAYMENT_METHODS, type PaymentMethod } from "@/lib/payments";
import type { InvoiceWithItems } from "@/lib/types";
import { translator, type UiLang } from "@/lib/ui";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  zelle: "Zelle",
  venmo: "Venmo",
  cashapp: "Cash App",
  bank: "Bank transfer",
  card: "Card",
  other: "Other",
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Deposits and partial payments on an invoice, with the balance still owed. */
export function PaymentsCard({ invoice, uiLang }: { invoice: InvoiceWithItems; uiLang: UiLang }) {
  const T = translator(uiLang);
  const router = useRouter();
  const payments = invoice.payments ?? [];
  const paid = paidCents(payments);
  const owed = balanceCents(invoice);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locale = uiLang === "es" ? "es-US" : "en-US";

  function start() {
    setError("");
    setAmount(owed > 0 ? centsToDollarString(owed) : "");
    setMethod("cash");
    setDate(today());
    setOpen(true);
  }

  async function save() {
    setError("");
    const cents = parseDollarsToCents(amount);
    if (!(cents > 0)) return setError(T("Enter the amount received."));
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_cents: cents, method, paid_on: date }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || T("Something went wrong. Try again."));
    setOpen(false);
    router.refresh();
  }

  async function remove(pid: number) {
    if (!window.confirm(T("Remove this payment?"))) return;
    const res = await fetch(`/api/invoices/${invoice.id}/payments?pid=${pid}`, { method: "DELETE" });
    if (!res.ok) return setError(T("Something went wrong. Try again."));
    router.refresh();
  }

  return (
    <div className="card noprint">
      <h2 style={{ marginTop: 0 }}>{T("Payments")}</h2>
      {payments.length > 0 ? (
        <div className="list" style={{ marginBottom: 10 }}>
          {payments.map((p) => (
            <div key={p.id} className="item">
              <span>
                {formatCents(p.amount_cents)}
                <small>
                  {formatDate(p.paid_on, locale)} · {T(METHOD_LABEL[p.method])}
                </small>
              </span>
              {p.method !== "card" && (
                <button type="button" className="x" aria-label={T("Remove this payment?")} onClick={() => remove(p.id)}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small" style={{ marginTop: 0 }}>
          {T("Got a deposit, cash, a check or Zelle? Record it here and the balance updates.")}
        </p>
      )}
      <div className="payTotals">
        <span>
          {T("Paid so far")}: <b>{formatCents(paid)}</b>
        </span>
        <span>
          {T("Balance due")}: <b>{formatCents(owed)}</b>
        </span>
      </div>

      {open ? (
        <div style={{ marginTop: 12 }}>
          <div className="row">
            <div className="field">
              <label htmlFor="pay-amount">{T("Amount $")}</label>
              <input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pay-method">{T("Method")}</label>
              <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.filter((m) => m !== "card").map((m) => (
                  <option key={m} value={m}>
                    {T(METHOD_LABEL[m])}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="pay-date">{T("Date")}</label>
            <input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="btns">
            <button type="button" className="alt" onClick={() => setOpen(false)} disabled={busy}>
              {T("Cancel")}
            </button>
            <button type="button" onClick={save} disabled={busy}>
              {busy ? T("Saving…") : T("Save payment")}
            </button>
          </div>
        </div>
      ) : (
        owed > 0 && (
          <div className="btns">
            <button type="button" className="alt" onClick={start}>
              {T("+ Record a payment")}
            </button>
          </div>
        )
      )}
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
