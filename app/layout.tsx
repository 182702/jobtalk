import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-condensed" });

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

// Kept free of cookies and sign-in checks so the home page is pre-built and
// served straight from the CDN. The app's top bar lives in app/(app)/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${condensed.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
