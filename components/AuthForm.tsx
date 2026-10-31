"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : mode === "signup" ? "/settings" : "/invoices";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ? "That link didn't work. Try again." : "");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.replace(next);
        router.refresh();
      }
      else setSent(true); // email confirmation required
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      else {
        router.replace(next);
        router.refresh();
      }
    }
    setBusy(false);
  }

  async function resetPassword() {
    if (!email) return setError("Enter your email first.");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings%23password`,
    });
    setError(error ? error.message : "");
    if (!error) setSent(true);
  }

  if (sent) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p className="muted">We sent a link to {email}. Open it on this device to continue.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="btns">
        <button type="submit" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </div>
      {error && <div className="err" role="alert">{error}</div>}
      <p className="muted small" style={{ marginBottom: 0 }}>
        {mode === "signup" ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup">Create an account</Link> ·{" "}
            <a href="#" onClick={(e) => (e.preventDefault(), resetPassword())}>
              Forgot password
            </a>
          </>
        )}
      </p>
    </form>
  );
}
