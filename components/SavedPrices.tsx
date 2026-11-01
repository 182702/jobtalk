"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";

type Item = { id: number; name: string; rate_cents: number };

/** Settings card listing the prices the app has learned, with a way to remove them. */
export function SavedPrices({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");

  async function remove(id: number) {
    setError("");
    const res = await fetch("/api/prices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!res.ok) return setError("Couldn't remove it. Try again.");
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div className="card">
      <h2>Saved prices</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        When you save an invoice, VoiceBill Pro remembers each item&apos;s price. Next time you mention the item without a price, it fills in your
        price and marks it so you can check it. Saving an invoice with a new price updates it.
      </p>
      {items.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>Nothing saved yet. Prices appear here after you save an invoice.</p>
      ) : (
        <div className="list">
          {items.map((it) => (
            <div key={it.id} className="item">
              <span>{it.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
                {formatCents(it.rate_cents)}
                <button type="button" className="x" aria-label={`Remove ${it.name}`} onClick={() => remove(it.id)}>
                  ✕
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {error && <div className="err">{error}</div>}
    </div>
  );
}
