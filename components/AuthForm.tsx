"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { translator, type UiLang } from "@/lib/ui";

export function AuthForm({ mode, lang }: { mode: "login" | "signup"; lang: UiLang }) {
  const T = translator(lang);
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : mode === "signup" ? "/start" : "/invoices";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    params.get("error")
      ? T("That link couldn't sign you in on this device. If you were confirming your email, it's confirmed: just log in below. (Links work best on the same phone or browser you signed up on.)")
      : "",
  );
  const [sent, setSent] = useState(false);
  const linkReason = params.get("reason")?.slice(0, 120) ?? "";

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
      if (error) setError(error.message === "Invalid login credentials" ? T("Wrong email or password.") : error.message);
      else {
        router.replace(next);
        router.refresh();
      }
    }
    setBusy(false);
  }

  async function resetPassword() {
    if (!email) return setError(T("Enter your email first."));
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings%23password`,
    });
    setError(error ? error.message : "");
    if (!error) setSent(true);
  }

  if (sent) {
    return (
      <div className="card">
        <h2>{T("Check your email")}</h2>
        <p className="muted">{T("We sent a link to {email}. Open it on this device to continue.", { email })}</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">{T("Email")}</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">{T("Password")}</label>
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
          {busy ? T("One moment…") : mode === "signup" ? T("Create account") : T("Log in")}
        </button>
      </div>
      {error && <div className="err" role="alert">{error}</div>}
      {error && linkReason && <p className="muted small">({linkReason})</p>}
      <p className="muted small" style={{ marginBottom: 0 }}>
        {mode === "signup" ? (
          <>
            {T("Already have an account?")} <Link href="/login">{T("Log in")}</Link>
          </>
        ) : (
          <>
            {T("New here?")} <Link href="/signup">{T("Create an account")}</Link> ·{" "}
            <a href="#" onClick={(e) => (e.preventDefault(), resetPassword())}>
              {T("Forgot password")}
            </a>
          </>
        )}
      </p>
    </form>
  );
}
