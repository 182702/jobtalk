import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { LINK_TYPES, safeNext } from "@/lib/auth-link";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies an email link's {{ .TokenHash }}. Runs only when a person taps the
 * button on /auth/confirm (a POST): email scanners that open links in advance
 * only load that page, so they can't use up the one-time link.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "") as EmailOtpType;
  const next = safeNext(String(form.get("next") ?? ""));
  const origin = new URL(request.url).origin;

  let reason = "missing or unknown link details";
  if (tokenHash && LINK_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin), 303);
    console.error("auth confirm failed", type, error.code, error.message);
    reason = error.message;
  }
  // Already used or expired: the email is usually confirmed anyway, so ask them to log in.
  return NextResponse.redirect(new URL(`/login?error=link&reason=${encodeURIComponent(reason.slice(0, 120))}`, origin), 303);
}
