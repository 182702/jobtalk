import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FREE_NOTES_PER_MONTH } from "@/lib/plans";
import s from "./landing.module.css";

function Icon({ d }: { d: string }) {
  return (
    <span className={s.icon}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </span>
  );
}

const WAVE = [10, 18, 26, 14, 22, 28, 12, 20, 24, 10, 16, 26, 18, 12, 22, 14];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className={`${s.page} landing`}>
      <div className={s.wrap}>
        <nav className={s.nav}>
          <Link href="/" className={s.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon.png" alt="" />
            <span>
              VoiceBill<em>Pro</em>
            </span>
          </Link>
          <div className={s.navLinks}>
            {user ? (
              <Link className={`${s.btn} ${s.small}`} href="/invoices">Open app</Link>
            ) : (
              <>
                <Link className={`${s.btnGhost} ${s.small}`} href="/login">Log in</Link>
                <Link className={`${s.btn} ${s.small}`} href="/signup">Start free</Link>
              </>
            )}
          </div>
        </nav>

        <header className={s.hero}>
          <h1>Talk through the job — get the invoice before you leave the driveway.</h1>
          <p className={s.lead}>
            Hit record and say what you did. VoiceBill Pro turns your voice note into labor, parts and tax, then emails a clean PDF invoice to your customer.
          </p>
          <div className={s.heroBtns}>
            <Link className={s.btn} href={user ? "/new" : "/signup"}>{user ? "New invoice" : "Start free"}</Link>
            {!user && <Link className={s.btnGhost} href="/login">Log in</Link>}
          </div>
          <p className={s.fine}>{FREE_NOTES_PER_MONTH} free job notes a month · then $24/month · cancel anytime</p>
        </header>

        <div className={`${s.card} ${s.math}`}>
          <p className={s.eyebrow}>How the math works</p>
          <h2>Hours × Rate + Parts + Tax = Total due</h2>
          <p>Every number comes from what you say. If you don&apos;t say a price, it&apos;s flagged — never guessed.</p>
        </div>

        <section className={`${s.section} ${s.center}`}>
          <p className={s.eyebrow}>Why VoiceBill Pro</p>
          <h2 className={s.h2}>Everything you need to get paid</h2>
          <div className={s.grid3} style={{ textAlign: "left" }}>
            <div className={`${s.card} ${s.feature}`}>
              <Icon d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              <h3>Talk, don&apos;t type</h3>
              <p>Say it the way you&apos;d tell a buddy, in the truck or on site. No forms, no spreadsheets.</p>
            </div>
            <div className={`${s.card} ${s.feature}`}>
              <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <h3>Prices never guessed</h3>
              <p>Your hourly and tax rates fill in automatically. Anything you didn&apos;t price shows in red before it goes out.</p>
            </div>
            <div className={`${s.card} ${s.feature}`}>
              <Icon d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              <h3>Send in one tap</h3>
              <p>Email a PDF with your logo and payment details, or copy a text version. See what&apos;s paid and what&apos;s owed.</p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <p className={s.eyebrow}>See it in action</p>
          <h2 className={s.demoTitle}>Turn a 30-second voice note into a ready-to-send invoice</h2>
          <div className={`${s.card} ${s.demo}`}>
            <div className={s.panel}>
              <div className={s.recRow}>
                <span className={s.mic} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                  </svg>
                </span>
                <span className={s.wave} aria-hidden="true">
                  {WAVE.map((h, i) => (
                    <i key={i} style={{ height: h }} />
                  ))}
                </span>
              </div>
              <p className={s.quote}>
                “Replaced the water heater at the Alvarez place. Two and a half hours at eighty-five. Forty-gallon heater, three eighty. Two shutoff valves at twelve each, plus the expansion tank.”
              </p>
            </div>
            <div className={s.panel}>
              <div className={s.invHead}>
                <b>Invoice #0012 · Alvarez</b>
                <span className={s.pill}>Ready</span>
              </div>
              <table className={s.inv}>
                <tbody>
                  <tr><td>Labor · 2.5 h × $85.00</td><td>$212.50</td></tr>
                  <tr><td>40-gallon water heater</td><td>$380.00</td></tr>
                  <tr><td>Shutoff valve · 2 × $12.00</td><td>$24.00</td></tr>
                  <tr><td>Expansion tank</td><td className={s.flag}>Add price</td></tr>
                  <tr className={s.sub}><td>Subtotal</td><td>$616.50</td></tr>
                  <tr className={s.sub}><td>Tax (8.25%)</td><td>$50.86</td></tr>
                  <tr className={s.total}><td>Total due</td><td>$667.36</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className={s.caption}>The expansion tank had no price in the note, so it&apos;s flagged for you to fill in. Nothing is made up.</p>
        </section>

        <section className={s.section}>
          <div className={`${s.card} ${s.price}`}>
            <p className={s.eyebrow}>Pricing</p>
            <h2>One plan. Everything included.</h2>
            <div className={s.amount}>
              $24<small> / month</small>
            </div>
            <p className={s.fine} style={{ marginTop: 4 }}>Start with {FREE_NOTES_PER_MONTH} free job notes a month. Cancel anytime.</p>
            <ul className={s.checks}>
              <li>Unlimited voice or typed job notes</li>
              <li>Labor, parts and tax calculated for you</li>
              <li>PDF invoices with your logo, emailed in one tap</li>
              <li>Paid / unpaid tracking and total outstanding</li>
              <li>Your rates, tax and payment details saved</li>
            </ul>
            <Link className={s.btn} href={user ? "/billing" : "/signup"}>{user ? "Go to billing" : "Start free"}</Link>
          </div>
        </section>

        <section className={s.cta}>
          <h2>Stop writing invoices at night.</h2>
          <p className={s.lead}>Built for plumbers, electricians, HVAC techs, handymen, and anyone who bills by the job.</p>
          <Link className={s.btn} href={user ? "/new" : "/signup"}>{user ? "New invoice" : "Try it free"}</Link>
        </section>

        <footer className={s.foot}>
          <span>© {new Date().getFullYear()} VoiceBill Pro</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </footer>
      </div>
    </div>
  );
}
