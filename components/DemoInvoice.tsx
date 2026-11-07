"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { computeTotals, formatCents, formatQuantity } from "@/lib/money";
import type { LineItem } from "@/lib/types";
import s from "@/app/landing.module.css";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};
function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => Recognition) | null;
}

type Lang = "en" | "es";
const EXAMPLES: Record<Lang, string[]> = {
  en: [
    "Fixed a leaking kitchen faucet for Maria Lopez. 2 hours, new cartridge $35.",
    "Replaced a ceiling fan for the Johnsons. 1.5 hours at $90, fan $129, and a wire kit.",
    "Full interior detail on a Ford F-150 for Mike, $180, plus pet hair removal $40.",
  ],
  es: [
    "Arreglé la llave de la cocina para Maria Lopez. 2 horas, cartucho nuevo $35.",
    "Cambié un ventilador de techo para los Johnson. 1.5 horas a $90, ventilador $129 y un kit de cables.",
  ],
};

/** Home page "Try it now": a visitor types or says a job and sees the invoice, without signing up. */
export function DemoInvoice() {
  const [lang, setLang] = useState<Lang>("en");
  const [note, setNote] = useState("");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [mic, setMic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ customer_name: string; items: LineItem[] } | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setMic(!!getRecognition()), []);
  useEffect(() => () => rec.current?.stop(), []);

  function toggleMic() {
    if (recording) return rec.current?.stop();
    const SR = getRecognition();
    if (!SR) return;
    const r = new SR();
    r.lang = lang === "es" ? "es-US" : "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let fin = "";
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
        else pending += e.results[i][0].transcript;
      }
      if (fin) setNote((n) => (n + " " + fin).trim());
      setInterim(pending);
    };
    r.onend = () => {
      setRecording(false);
      setInterim("");
    };
    r.onerror = () => setRecording(false);
    try {
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  async function run() {
    rec.current?.stop();
    setError("");
    const text = note.trim();
    if (text.length < 3) return setError(lang === "es" ? "Escriba o diga un trabajo primero." : "Type or say a job first.");
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: text, language: lang }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      setResult({ customer_name: data.customer_name, items: data.items });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const totals = result ? computeTotals(result.items, 0) : null;
  const missing = result ? result.items.filter((i) => !(i.rate_cents > 0)).length : 0;
  const es = lang === "es";

  return (
    <section id="try" className={s.demoTry}>
      <p className={s.eyebrow}>{es ? "Pruébelo ahora · sin registrarse" : "Try it now · no sign-up"}</p>
      <h2 className={s.tryTitle}>{es ? "Diga un trabajo. Vea la factura." : "Say a job. See the invoice."}</h2>
      <div className={s.tryGrid}>
        <div className={s.tryPanel}>
          <div className={s.tryTop}>
            <span className={s.panelLabel}>{es ? "Nota del trabajo" : "Job note"}</span>
            <span className={s.trySeg} role="group" aria-label="Language">
              {(["en", "es"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={lang === l ? s.on : ""}
                  aria-pressed={lang === l}
                  onClick={() => {
                    rec.current?.stop();
                    setLang(l);
                    setResult(null);
                  }}
                >
                  {l === "en" ? "English" : "Español"}
                </button>
              ))}
            </span>
          </div>
          <textarea
            className={s.tryText}
            value={interim ? `${note} ${interim}`.trim() : note}
            onChange={(e) => setNote(e.target.value)}
            readOnly={recording}
            maxLength={600}
            placeholder={es ? "Toque un ejemplo abajo, o escriba o diga su trabajo…" : "Tap an example below, or type or say your own job…"}
            aria-label={es ? "Nota del trabajo" : "Job note"}
          />
          <div className={s.chips}>
            {EXAMPLES[lang].map((ex, i) => (
              <button key={i} type="button" onClick={() => (setNote(ex), setResult(null))}>
                {es ? "Ejemplo" : "Example"} {i + 1}
              </button>
            ))}
          </div>
          <div className={s.tryBtns}>
            {mic && (
              <button type="button" className={`${s.btnGhost} ${recording ? s.recOn : ""}`} onClick={toggleMic} aria-pressed={recording}>
                {recording ? (es ? "■ Parar" : "■ Stop") : es ? "🎙 Hablar" : "🎙 Speak"}
              </button>
            )}
            <button type="button" className={s.btn} onClick={run} disabled={busy || recording}>
              {busy ? (es ? "Haciendo la factura…" : "Making your invoice…") : es ? "Hacer factura" : "Make invoice"}
            </button>
          </div>
          {error && (
            <p className={s.tryErr} role="alert">
              {error}
            </p>
          )}
          <p className={s.tryFine}>
            {es
              ? "El demo usa $85 por hora si no dice una tarifa. En la app usted pone la suya. No se guarda nada."
              : "The demo uses $85/hour when you don't say a rate. In the app, you set your own. Nothing is saved."}
          </p>
        </div>

        <div className={s.tryPanel} aria-live="polite">
          {!result ? (
            <div className={s.tryEmpty}>{busy ? (es ? "Leyendo su nota…" : "Reading your note…") : es ? "Su factura aparece aquí." : "Your invoice shows up here."}</div>
          ) : (
            <>
              <div className={s.invHead}>
                <b>
                  {es ? "Factura" : "Invoice"} · {result.customer_name || (es ? "Cliente" : "Customer")}
                </b>
                {missing > 0 ? (
                  <span className={s.pillWarn}>{es ? `Falta${missing === 1 ? "" : "n"} ${missing} precio${missing === 1 ? "" : "s"}` : `${missing} price${missing === 1 ? "" : "s"} missing`}</span>
                ) : (
                  <span className={s.pillOk}>{es ? "Lista" : "Ready"}</span>
                )}
              </div>
              <table className={s.inv}>
                <tbody>
                  {result.items.map((it, i) => (
                    <tr key={i} className={it.rate_cents > 0 ? "" : s.missRow}>
                      <td>
                        {it.description}
                        {it.quantity !== 1 && it.rate_cents > 0 ? ` · ${formatQuantity(it.quantity)} × ${formatCents(it.rate_cents)}` : ""}
                      </td>
                      <td>{it.rate_cents > 0 ? formatCents(totals!.lines[i].amount_cents) : es ? "Agregar precio" : "Add price"}</td>
                    </tr>
                  ))}
                  <tr className={s.total}>
                    <td>{missing > 0 ? (es ? "Subtotal hasta ahora" : "Subtotal so far") : es ? "Total a pagar" : "Total due"}</td>
                    <td>{formatCents(totals!.subtotal_cents)}</td>
                  </tr>
                </tbody>
              </table>
              {missing > 0 && (
                <p className={s.tryFine}>
                  {es
                    ? "Lo que no tiene precio queda en rojo. Nunca se inventan precios: usted los llena antes de enviar."
                    : "Anything without a price stays red. Prices are never made up: you fill them in before sending."}
                </p>
              )}
              <div className={s.tryCta}>
                <Link className={s.btn} href="/signup">
                  {es ? "Empezar gratis" : "Start free"}
                </Link>
                <span>{es ? "Guarde, envíe por correo y cobre. 5 facturas gratis al mes, sin tarjeta." : "Save it, email it, get paid. 5 free invoices a month, no card."}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
