"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { translator, type UiLang } from "@/lib/ui";

type Mood = "happy" | "meh" | "unhappy";
const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: "happy", emoji: "😀", label: "Happy" },
  { value: "meh", emoji: "😐", label: "Okay" },
  { value: "unhappy", emoji: "😞", label: "Unhappy" },
];

/** Floating "Feedback" button for signed-in contractors. Hidden on the landing page and customer links. */
export function FeedbackButton({ lang }: { lang: UiLang }) {
  const T = translator(lang);
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (path === "/" || path.startsWith("/i/") || path === "/login" || path === "/signup") return null;

  function close() {
    setOpen(false);
    if (state === "done") {
      setState("idle");
      setMessage("");
      setMood(null);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return setError(T("Write a short message first."));
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mood, page: path }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || T("Couldn't send. Try again."));
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return (
    <>
      <button type="button" className="fbBtn alt noprint" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={T("Send feedback")} title={T("Send feedback")}>
        <span aria-hidden="true">💬</span>
        <span className="fbLabel">{T("Feedback")}</span>
      </button>
      {open && (
        <div className="fbBackdrop" onClick={close}>
          <div className="fbSheet card" role="dialog" aria-modal="true" aria-labelledby="fb-title" onClick={(e) => e.stopPropagation()}>
            {state === "done" ? (
              <>
                <h2 id="fb-title">{T("Thanks! 🙏")}</h2>
                <p className="muted">{T("Isaac reads every message. If you asked something, you'll get a reply by email.")}</p>
                <button type="button" onClick={close} style={{ width: "100%" }}>{T("Close")}</button>
              </>
            ) : (
              <form onSubmit={send}>
                <h2 id="fb-title">{T("Send feedback")}</h2>
                <p className="muted small" style={{ marginTop: 0 }}>{T("What's confusing, broken, or missing? Anything helps.")}</p>
                <div className="fbMoods" role="group" aria-label={T("How do you feel about VoiceBill Pro?")}>
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={mood === m.value ? "on" : ""}
                      aria-pressed={mood === m.value}
                      onClick={() => setMood(mood === m.value ? null : m.value)}
                    >
                      <span aria-hidden="true">{m.emoji}</span> {T(m.label)}
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  placeholder={T("Type here, or tap your keyboard's 🎙 to talk")}
                  aria-label={T("Your feedback")}
                  autoFocus
                  style={{ minHeight: 110 }}
                />
                {error && <div className="err" role="alert">{error}</div>}
                <div className="btns">
                  <button type="button" className="alt" onClick={close}>{T("Cancel")}</button>
                  <button type="submit" disabled={state === "busy"}>{state === "busy" ? T("Sending…") : T("Send")}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
