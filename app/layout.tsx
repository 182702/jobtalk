import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VoiceBill Pro", template: "%s · VoiceBill Pro" },
  description: "Talk through the job. Get the invoice.",
  appleWebApp: { capable: true, title: "VoiceBill Pro", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#161615" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="in">
            <Link className="logo" href={user ? "/invoices" : "/"}>
              VoiceBill<span>Pro</span>
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
