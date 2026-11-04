import Link from "next/link";
import { FeedbackButton } from "@/components/FeedbackButton";
import { LangSwitch } from "@/components/LangSwitch";
import { createClient } from "@/lib/supabase/server";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

/** Top bar and feedback button for the app pages (everything except the home page). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = await getUiLang();
  const T = translator(lang);

  return (
    <div lang={lang}>
      <header className="topbar">
        <div className={user ? "in authed" : "in"}>
          <Link className="logo" href={user ? "/invoices" : "/"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon.png" alt="" width={28} height={28} />
            <span className="logoText">
              VoiceBill<span>Pro</span>
            </span>
          </Link>
          <nav>
            {user ? (
              <>
                <Link href="/invoices">{T("Invoices")}</Link>
                <Link href="/settings">{T("Settings")}</Link>
                <Link className="btn small" href="/new">
                  {T("+ New")}
                </Link>
                <LangSwitch lang={lang} className="navOut" />
                <form action="/auth/signout" method="post" className="navOut">
                  <button type="submit" className="linkish">
                    {T("Log out")}
                  </button>
                </form>
              </>
            ) : (
              <>
                <LangSwitch lang={lang} />
                <Link href="/login">{T("Log in")}</Link>
                <Link className="btn small" href="/signup">
                  {T("Sign up")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {children}
      {user && <FeedbackButton lang={lang} />}
    </div>
  );
}
