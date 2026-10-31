import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "VoiceBill Pro", template: "%s · VoiceBill Pro" },
  description: "Talk through the job. Get the invoice.",
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

  return (
    <html lang="en" className={display.variable}>
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
                  <Link href="/invoices">Invoices</Link>
                  <Link href="/settings">Settings</Link>
                  <Link className="btn small" href="/new">
                    + New
                  </Link>
                  <form action="/auth/signout" method="post" className="navOut">
                    <button type="submit" className="linkish">Log out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">Log in</Link>
                  <Link className="btn small" href="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
