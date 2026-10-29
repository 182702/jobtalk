import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JobTalk", template: "%s · JobTalk" },
  description: "Talk through the job. Get the invoice.",
  appleWebApp: { capable: true, title: "JobTalk", statusBarStyle: "default" },
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
              Job<span>Talk</span>
            </Link>
            <nav>
              {user ? (
                <>
                  <Link href="/invoices">Invoices</Link>
                  <Link href="/settings">Settings</Link>
                  <Link className="btn small" href="/new">
                    + New
                  </Link>
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
