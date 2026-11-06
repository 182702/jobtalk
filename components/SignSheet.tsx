"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { formatCents } from "@/lib/money";
import type { InvoiceWithItems, SignatureKind } from "@/lib/types";
import { translator, type UiLang } from "@/lib/ui";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Full-screen sheet the contractor hands to the customer. The wording is in the
 * invoice's language (the customer reads it); errors from the server come back
 * in the contractor's menu language.
 */
export function SignSheet({
  invoice,
  kind,
  uiLang,
  onDone,
  onCancel,
}: {
  invoice: InvoiceWithItems;
  kind: SignatureKind;
  uiLang: UiLang;
  onDone: () => void;
  onCancel: () => void;
}) {
  const L = t(invoice.language);
  const T = translator(uiLang);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState(kind === "approve" || !invoice.signatures?.length ? invoice.customer_name : invoice.signatures[0].signer_name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Size the drawing surface to the screen (sharp on high-density phones).
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const setup = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      setHasInk(false);
    };
    setup();
    window.addEventListener("resize", setup);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", setup);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    last.current = p;
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
    setHasInk(true);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function up() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  }

  async function save() {
    setError("");
    if (!name.trim() || !hasInk) return setError(L.signMissing);
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/signatures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, signer_name: name.trim(), image: canvas.current!.toDataURL("image/png"), signed_on: today() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || T("Couldn't save the signature. Try again."));
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="signSheet" role="dialog" aria-modal="true" aria-labelledby="sign-title" lang={invoice.language === "es" ? "es" : "en"}>
      <div className="signInner">
        <h2 id="sign-title">{L.signTitle[kind]}</h2>
        <p className="signStatement">{L.signStatement[kind]}</p>
        <div className="signTotal">
          <span>{L.totalDue}</span>
          <b>{formatCents(invoice.total_cents)}</b>
        </div>
        <label htmlFor="signer">{L.yourName}</label>
        <input id="signer" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
        <div className="signPadWrap">
          <canvas
            ref={canvas}
            className="signPad"
            aria-label={L.signHere}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
          {!hasInk && <span className="signHint">{L.signHere}</span>}
          <span className="signLine" aria-hidden="true" />
        </div>
        <button type="button" className="signClear" onClick={clear}>
          {L.clearSignature}
        </button>
        {error && (
          <div className="signErr" role="alert">
            {error}
          </div>
        )}
        <div className="signBtns">
          <button type="button" className="signCancel" onClick={onCancel} disabled={busy}>
            {L.cancel}
          </button>
          <button type="button" className="signOk" onClick={save} disabled={busy}>
            {busy ? "…" : L.sign}
          </button>
        </div>
      </div>
    </div>
  );
}
