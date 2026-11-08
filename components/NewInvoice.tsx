"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { MAX_NOTE_CHARS } from "@/lib/plans";
import type { Draft } from "@/lib/types";
import { translator, type UiLang } from "@/lib/ui";

// Minimal typing for the browser Speech Recognition API (not in lib.dom).
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => Recognition) | null;
}

type Lang = "en" | "es";
const LANG_KEY = "voicebill:lang";
const SPEECH_LANG: Record<Lang, string> = { en: "en-US", es: "es-US" };
const PLACEHOLDER: Record<Lang, string> = {
  en: "Replaced water heater for Dana Smith. 3 hours labor at $85, 40-gallon heater $450, $40 disposal fee.",
  es: "Cambié el calentador de agua para Dana Smith. 3 horas de trabajo a $85, calentador de 40 galones $450, $40 de desecho.",
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewInvoice({
  taxRateBps,
  usage,
  uiLang,
  firstTime = false,
  allowEstimate = false,
}: {
  taxRateBps: number;
  usage: { plan: "free" | "solo"; used: number; limit: number };
  uiLang: UiLang;
  firstTime?: boolean;
  allowEstimate?: boolean;
}) {
  const T = translator(uiLang);
  const router = useRouter();
  const [note, setNote] = useState("");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [used, setUsed] = useState(usage.used);
  const [lang, setLang] = useState<Lang>(uiLang);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setMicSupported(!!getRecognition()), []);
  // Remember the contractor's voice language; first time, follow the menu language.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {}
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  function chooseLang(l: Lang) {
    if (recording) rec.current?.stop();
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }
  useEffect(() => () => rec.current?.stop(), []);

  function toggleMic() {
    setError("");
    if (recording) {
      rec.current?.stop();
      return;
    }
    const SR = getRecognition();
    if (!SR) return;
    try {
      const r = new SR();
      r.lang = SPEECH_LANG[lang];
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let finalText = "";
        let pending = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText += res[0].transcript + " ";
          else pending += res[0].transcript;
        }
        if (finalText) setNote((n) => (n + " " + finalText).trim());
        setInterim(pending);
      };
      r.onend = () => {
        setRecording(false);
        setInterim("");
      };
      r.onerror = (e) => {
        setRecording(false);
        if (e.error !== "aborted" && e.error !== "no-speech") setError(T("The mic isn't available here. Type the note instead."));
      };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      setError(T("The mic isn't available here. Type the note instead."));
    }
  }

  async function makeInvoice() {
    rec.current?.stop();
    setError("");
    setUpgrade(false);
    const text = note.trim();
    if (!text) return setError(T("Add a job note first."));
    setBusy(true);
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: text, language: lang }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || T("Something went wrong. Try again."));
        setUpgrade(!!data.upgrade);
        return;
      }
      setUsed(data.notes_used);
      setDraft({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        issued_on: today(),
        notes: data.notes,
        original_note: text,
        tax_rate_bps: taxRateBps,
        language: lang,
        items: data.items,
      });
    } catch {
      setError(T("Couldn't reach the server. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  }

  async function save(d: Draft) {
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || T("Couldn't save the invoice.");
    router.push(`/invoices/${data.id}`);
    router.refresh();
  }

  if (draft) {
    return <InvoiceEditor initial={draft} saveLabel={T("Save invoice")} onSave={save} onCancel={() => setDraft(null)} uiLang={uiLang} allowEstimate={allowEstimate} />;
  }

  return (
    <div className="card">
      {firstTime && (
        <div className="hint">
          <b>{T("How it works")}</b>
          <ol>
            <li>{T("Pick the language you will talk in.")}</li>
            <li>{T("Tap Speak and say the customer's name, what you did, hours and prices.")}</li>
            <li>{T("Tap Make invoice. Check it, fix anything in red, then save.")}</li>
          </ol>
          <p className="muted small" style={{ margin: 0 }}>
            {T("Example:")} <i>{PLACEHOLDER[lang]}</i>
          </p>
        </div>
      )}
      <div className="langRow">
        <label htmlFor="note" style={{ margin: 0 }}>{T("Job note")}</label>
        <div className="seg" role="group" aria-label={T("Language you will talk in")}>
          <button type="button" className={lang === "en" ? "on" : ""} aria-pressed={lang === "en"} onClick={() => chooseLang("en")}>
            English
          </button>
          <button type="button" className={lang === "es" ? "on" : ""} aria-pressed={lang === "es"} onClick={() => chooseLang("es")}>
            Español
          </button>
        </div>
      </div>
      <textarea
        id="note"
        value={interim ? `${note} ${interim}`.trim() : note}
        onChange={(e) => setNote(e.target.value)}
        readOnly={recording}
        maxLength={MAX_NOTE_CHARS}
        placeholder={PLACEHOLDER[lang]}
      />
      <div className="btns">
        {micSupported && (
          <button type="button" className={recording ? "rec" : "alt"} onClick={toggleMic} aria-pressed={recording}>
            {recording ? T("■ Stop") : T("🎙 Speak")}
          </button>
        )}
        <button type="button" onClick={makeInvoice} disabled={busy || recording}>
          {busy ? T("Working…") : T("Make invoice")}
        </button>
      </div>
      {!micSupported && <p className="muted small">{T("Voice input isn't supported in this browser. Type the note, or use your keyboard's mic button.")}</p>}
      {error && (
        <div className="err" role="alert">
          {error} {upgrade && <Link href="/billing">{T("Upgrade")}</Link>}
        </div>
      )}
      {usage.plan === "free" && (
        <p className="muted small" style={{ marginBottom: 0 }}>
          {T("{n} of {limit} free notes left this month.", { n: Math.max(0, usage.limit - used), limit: usage.limit })} <Link href="/billing">{T("Go unlimited")}</Link>
        </p>
      )}
    </div>
  );
}
