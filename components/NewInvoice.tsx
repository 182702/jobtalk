"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { MAX_NOTE_CHARS } from "@/lib/plans";
import type { Draft } from "@/lib/types";

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

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewInvoice({ taxRateBps, usage }: { taxRateBps: number; usage: { plan: "free" | "solo"; used: number; limit: number } }) {
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
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setMicSupported(!!getRecognition()), []);
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
      r.lang = navigator.language || "en-US";
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
        if (e.error !== "aborted" && e.error !== "no-speech") setError("The mic isn't available here. Type the note instead.");
      };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      setError("The mic isn't available here. Type the note instead.");
    }
  }

  async function makeInvoice() {
    rec.current?.stop();
    setError("");
    setUpgrade(false);
    const text = note.trim();
    if (!text) return setError("Add a job note first.");
    setBusy(true);
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: text }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
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
        items: data.items,
      });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save(d: Draft) {
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || "Couldn't save the invoice.";
    router.push(`/invoices/${data.id}`);
    router.refresh();
  }

  if (draft) {
    return <InvoiceEditor initial={draft} saveLabel="Save invoice" onSave={save} onCancel={() => setDraft(null)} />;
  }

  return (
    <div className="card">
      <label htmlFor="note">Job note</label>
      <textarea
        id="note"
        value={interim ? `${note} ${interim}`.trim() : note}
        onChange={(e) => setNote(e.target.value)}
        readOnly={recording}
        maxLength={MAX_NOTE_CHARS}
        placeholder="Replaced water heater for Dana Smith. 3 hours labor at $85, 40-gallon heater $450, $40 disposal fee."
      />
      <div className="btns">
        {micSupported && (
          <button type="button" className={recording ? "rec" : "alt"} onClick={toggleMic} aria-pressed={recording}>
            {recording ? "■ Stop" : "🎙 Speak"}
          </button>
        )}
        <button type="button" onClick={makeInvoice} disabled={busy || recording}>
          {busy ? "Working…" : "Make invoice"}
        </button>
      </div>
      {!micSupported && <p className="muted small">Voice input isn&apos;t supported in this browser. Type the note, or use your keyboard&apos;s mic button.</p>}
      {error && (
        <div className="err" role="alert">
          {error} {upgrade && <Link href="/billing">Upgrade</Link>}
        </div>
      )}
      {usage.plan === "free" && (
        <p className="muted small" style={{ marginBottom: 0 }}>
          {Math.max(0, usage.limit - used)} of {usage.limit} free notes left this month. <Link href="/billing">Go unlimited</Link>
        </p>
      )}
    </div>
  );
}
