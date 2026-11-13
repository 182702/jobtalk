import type { EmailOtpType } from "@supabase/supabase-js";

export const LINK_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

/** Same-site paths only, so a link can't send people elsewhere. */
export function safeNext(value: string | null | undefined): string {
  const v = value || "/invoices";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/invoices";
}
