import Link from "next/link";
import { LINK_TYPES, safeNext } from "@/lib/auth-link";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Confirm", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token_hash?: string; type?: string; next?: string }> };

/**
 * Where email links land. Nothing is used up until the person taps the button,
 * because email scanners open links automatically and would spend the one-time link.
 */
export default async function ConfirmPage({ searchParams }: Props) {
  const { token_hash, type, next } = await searchParams;
  const T = translator(await getUiLang());
  const ok = !!token_hash && LINK_TYPES.includes(type as (typeof LINK_TYPES)[number]);
  const recovery = type === "recovery";

  return (
    <main style={{ maxWidth: 440, paddingTop: 48 }}>
      <div className="card" style={{ textAlign: "center", padding: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon.png" alt="" width={48} height={48} style={{ borderRadius: 12 }} />
        {ok ? (
          <form method="post" action="/auth/confirm/verify">
            <h1 style={{ fontSize: 24 }}>{recovery ? T("Reset your password") : T("Confirm your email")}</h1>
            <p className="muted">{recovery ? T("Tap the button to continue, then choose a new password.") : T("One tap and you're in.")}</p>
            <input type="hidden" name="token_hash" value={token_hash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={safeNext(next)} />
            <button type="submit" style={{ width: "100%", fontSize: 17, padding: 14 }}>
              {recovery ? T("Continue") : T("Confirm my email")}
            </button>
          </form>
        ) : (
          <>
            <h1 style={{ fontSize: 24 }}>{T("This link isn't complete")}</h1>
            <p className="muted">{T("Open the newest email from VoiceBill Pro and tap the button again, or log in.")}</p>
            <Link className="btn" href="/login" style={{ width: "100%" }}>
              {T("Log in")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
