"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, trade, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setState("done");
    } catch (err) {
      setError((err as Error).message || "Something went wrong. Try again.");
      setState("idle");
    }
  }

  if (state === "done") return <p className="okmsg" style={{ fontSize: 17 }}>You&apos;re on the list. We&apos;ll be in touch.</p>;

  return (
    <form onSubmit={submit} style={{ maxWidth: 420, margin: "0 auto", textAlign: "left" }}>
      <div className="field">
        <label htmlFor="wl-email">Email</label>
        <input id="wl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="wl-trade">Your trade (optional)</label>
        <input id="wl-trade" value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="Plumbing, electrical, HVAC…" />
      </div>
      {/* Honeypot, hidden from people. */}
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
      <button type="submit" disabled={state === "busy"} style={{ width: "100%" }}>
        {state === "busy" ? "Joining…" : "Join the waitlist"}
      </button>
      {error && <div className="err">{error}</div>}
    </form>
  );
}
