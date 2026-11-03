import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import { FeedbackButton } from "@/components/FeedbackButton";
import { LangSwitch } from "@/components/LangSwitch";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://voicebillpro.com"),
  title: { default: "VoiceBill Pro: voice-to-invoice app for contractors", template: "%s · VoiceBill Pro" },
  description:
    "VoiceBill Pro turns a contractor's voice note into a ready-to-send invoice with labor, parts and tax, in English or Spanish. Built in Springdale, Arkansas. Free for 5 invoices a month.",
  openGraph: {
    type: "website",
    siteName: "VoiceBill Pro",
    title: "VoiceBill Pro: talk through the job, get the invoice",
    description: "Turn a voice note into a ready-to-send invoice with labor, parts and tax. English or Spanish. Free to try.",
    images: [{ url: "/brand/launch/gallery-1.png", width: 1270, height: 760 }],
  },
  twitter: { card: "summary_large_image", images: ["/brand/launch/gallery-1.png"] },
  appleWebApp: { capable: true, title: "VoiceBill Pro", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06102a",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = await getUiLang();
  const T = translator(lang);

  return (
    <html lang={lang} className={display.variable}>
      <body>
        <header className="topbar">
          <div className={user ? "in authed" : "in"}>
            <Link className="logo" href={user ? "/invoices" : "/"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icon.png" alt="" />
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
                    <button type="submit" className="linkish">{T("Log out")}</button>
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
        <Analytics />
      </body>
    </html>
  );
}
