"use client";

import { useState } from "react";
import { missingPriceCount } from "@/lib/invoice";
import {
  bpsToPercentString,
  centsToDollarString,
  computeTotals,
  formatCents,
  formatQuantity,
  parseDollarsToCents,
  parsePercentToBps,
} from "@/lib/money";
import type { Draft } from "@/lib/types";

// Text state for each editable line, so partial input like "12." isn't lost.
type Row = { key: number; description: string; quantity: string; rate: string };

let nextKey = 1;
function toRow(i: Draft["items"][number]): Row {
  return {
    key: nextKey++,
    description: i.description,
    quantity: formatQuantity(i.quantity),
    rate: i.rate_cents ? centsToDollarString(i.rate_cents) : "",
  };
}

function parseQty(s: string): number {
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function InvoiceEditor({
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: Draft;
  saveLabel: string;
  onSave: (draft: Draft) => Promise<string | void>;
  onCancel?: () => void;
}) {
  const [customer, setCustomer] = useState(initial.customer_name);
  const [email, setEmail] = useState(initial.customer_email);
  const [date, setDate] = useState(initial.issued_on);
  const [notes, setNotes] = useState(initial.notes);
  const [tax, setTax] = useState(initial.tax_rate_bps ? bpsToPercentString(initial.tax_rate_bps) : "");
  const [language, setLanguage] = useState<"en" | "es">(initial.language);
  const [rows, setRows] = useState<Row[]>(() => initial.items.map(toRow));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const items = rows.map((r) => ({ description: r.description, quantity: parseQty(r.quantity), rate_cents: parseDollarsToCents(r.rate) }));
  const taxBps = parsePercentToBps(tax);
  const totals = computeTotals(items, taxBps);
  const missing = missingPriceCount(items);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function save() {
    setError("");
    if (!rows.length) return setError("Add at least one line.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("That customer email doesn't look right.");
    setBusy(true);
    const err = await onSave({
      customer_name: customer.trim(),
      customer_email: email.trim(),
      issued_on: date,
      notes,
      original_note: initial.original_note,
      tax_rate_bps: taxBps,
      language,
      items: items.map((i) => ({ ...i, description: i.description.trim() })),
    });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="card">
      <h2>Review invoice</h2>
      <div className="row">
        <div className="field">
          <label htmlFor="customer">Customer</label>
          <input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Dana Smith" />
        </div>
        <div className="field">
          <label htmlFor="cemail">Customer email</label>
          <input id="cemail" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dana@example.com" />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="tax">Tax %</label>
          <input id="tax" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ilang">Invoice language (what your customer sees)</label>
        <select id="ilang" value={language} onChange={(e) => setLanguage(e.target.value === "es" ? "es" : "en")}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      <div className="lines">
        {rows.map((r, idx) => {
          const noPrice = !(items[idx].rate_cents > 0);
          return (
            <div key={r.key} className={`line${noPrice ? " miss" : ""}`}>
              <label htmlFor={`d${r.key}`}>Item</label>
              <input id={`d${r.key}`} value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} placeholder="Description" />
              <div className="cols">
                <div>
                  <label htmlFor={`q${r.key}`}>Qty</label>
                  <input id={`q${r.key}`} inputMode="decimal" value={r.quantity} onChange={(e) => update(r.key, { quantity: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={`r${r.key}`}>Rate $</label>
                  <input
                    id={`r${r.key}`}
                    inputMode="decimal"
                    className={noPrice ? "miss" : ""}
                    value={r.rate}
                    onChange={(e) => update(r.key, { rate: e.target.value })}
                    placeholder="0.00"
                    aria-invalid={noPrice}
                  />
                </div>
                <div className="amt">{formatCents(totals.lines[idx].amount_cents)}</div>
                <button type="button" className="x" aria-label="Delete line" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="btns">
        <button type="button" className="alt" onClick={() => setRows((rs) => [...rs, toRow({ description: "", quantity: 1, rate_cents: 0 })])}>
          + Add line
        </button>
      </div>

      <table className="tot" style={{ marginTop: 12 }}>
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td className="n">{formatCents(totals.subtotal_cents)}</td>
          </tr>
          {taxBps > 0 && (
            <tr>
              <td>Tax ({bpsToPercentString(taxBps)}%)</td>
              <td className="n">{formatCents(totals.tax_cents)}</td>
            </tr>
          )}
          <tr className="grand">
            <td>Total due</td>
            <td className="n">{formatCents(totals.total_cents)}</td>
          </tr>
        </tbody>
      </table>

      {missing > 0 && (
        <div className="warn" role="status">
          ⚠ {missing} line{missing === 1 ? " has" : "s have"} no price. Fill in the red fields before sending.
        </div>
      )}

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="notes">Notes for the customer</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 70 }} />
      </div>

      <div className="btns">
        {onCancel && (
          <button type="button" className="alt" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" onClick={save} disabled={busy}>
          {busy ? "Saving…" : saveLabel}
        </button>
      </div>
      {error && <div className="err" role="alert">{error}</div>}
    </div>
  );
}
