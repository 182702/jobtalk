import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

/**
 * Landing point for links in Supabase emails that use {{ .TokenHash }}.
 * Unlike /auth/callback (which needs the browser that started sign-up), this
 * works in any browser, including the Gmail app's built-in one.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/invoices";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/invoices";

  let reason = "missing or unknown link details";
  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("auth confirm failed", type, error.code, error.message);
    reason = error.message;
  } else {
    console.error("auth confirm: bad params", { hasToken: !!tokenHash, type });
  }
  // Already used or expired: the email is usually confirmed anyway, so ask them to log in.
  // The reason (no secrets in it) helps when someone reports a problem.
  return NextResponse.redirect(new URL(`/login?error=link&reason=${encodeURIComponent(reason.slice(0, 120))}`, url.origin));
}
