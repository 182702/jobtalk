import Link from "next/link";
import { DemoInvoice } from "@/components/DemoInvoice";
import { FREE_NOTES_PER_MONTH } from "@/lib/plans";
import s from "./landing.module.css";

const WAVE = [8, 14, 22, 12, 26, 18, 30, 16, 24, 10, 20, 28, 14, 22, 12, 26, 18, 10, 16, 24, 12, 20, 8, 14];

function Mic({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const STEPS = [
  { title: "Speak", text: "Tell it what you did, in your own words. English or Spanish.", d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3", tone: "orange" },
  { title: "Check", text: "See a clean invoice. Anything without a price is flagged in red, never guessed.", d: "M4 12l5 5L20 6", tone: "blue" },
  { title: "Send", text: "Email a PDF with your logo and payment details. Track what's paid.", d: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z", tone: "orange" },
];

// Static: built once and served from the CDN. Signed-in visitors who tap
// "Log in" are sent straight to their invoices by proxy.ts.
export default function Landing() {
  return (
    <div className={`${s.page} landing`}>
      <div className={s.wrap}>
        <nav className={s.nav}>
          <Link href="/" className={s.brand}>
            <span className={s.brandMic}>
              <Mic size={18} />
            </span>
            <span>
              VoiceBill<em>Pro</em>
            </span>
          </Link>
          <div className={s.navLinks}>
            <a className={s.navText} href="#how">How it works</a>
            <a className={s.navText} href="#pricing">Pricing</a>
            <Link className={s.navText} href="/login">Log in</Link>
            <Link className={`${s.btn} ${s.small}`} href="/signup">Start free</Link>
          </div>
        </nav>

        <header className={s.hero}>
          <div className={s.heroText}>
            <span className={s.stripes} aria-hidden="true" />
            <h1>
              Talk through the job. <em>Get the invoice before you leave the driveway.</em>
            </h1>
            <p className={s.lead}>
              Turn your voice into a clean, ready-to-send invoice. Built for plumbers, electricians, HVAC techs and handymen who work in the field.
            </p>
            <div className={s.heroBtns}>
              <Link className={s.btn} href="/signup">
                Start free <Arrow />
              </Link>
              <a className={s.btnGhost} href="#try">Try it now, no sign-up</a>
            </div>
          </div>

          <div className={s.appFrame} aria-label="Example: a voice note becomes an invoice">
            <div className={s.appBar}>
              <span className={s.appBrand}>
                <Mic size={13} /> VoiceBill<em>Pro</em>
              </span>
              <span className={s.appTabs}>
                <b>New invoice</b> Invoices · Settings
              </span>
            </div>
            <div className={s.appBody}>
              <div className={s.panel}>
                <p className={s.panelLabel}>Job note</p>
                <div className={s.wave} aria-hidden="true">
                  {WAVE.map((h, i) => (
                    <i key={i} style={{ height: h }} />
                  ))}
                </div>
                <div className={s.recRow}>
                  <span className={s.recDot} aria-hidden="true" /> 0:24
                </div>
                <p className={s.quote}>
                  “Replaced the outdoor faucet for the Alvarez place. Hour and a half at eighty-five, faucet forty-two. Added a shutoff valve.”
                </p>
              </div>
              <div className={s.arrowCol} aria-hidden="true">
                <Arrow />
              </div>
              <div className={s.panel}>
                <div className={s.invHead}>
                  <b>Invoice #0012</b>
                  <span className={s.pillWarn}>1 price missing</span>
                </div>
                <table className={s.inv}>
                  <tbody>
                    <tr>
                      <td>Labor · 1.5 h × $85</td>
                      <td>$127.50</td>
                    </tr>
                    <tr>
                      <td>Outdoor faucet</td>
                      <td>$42.00</td>
                    </tr>
                    <tr className={s.missRow}>
                      <td>Shutoff valve</td>
                      <td>Add price</td>
                    </tr>
                    <tr className={s.sub}>
                      <td>Subtotal so far</td>
                      <td>$169.50</td>
                    </tr>
                    <tr className={s.total}>
                      <td>Total due</td>
                      <td className={s.flag}>Add valve price</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </header>

        <div className={s.badges}>
          <span>{FREE_NOTES_PER_MONTH} free job notes a month</span>
          <i aria-hidden="true" />
          <span>No card needed</span>
          <i aria-hidden="true" />
          <span>English or Spanish</span>
        </div>

        <DemoInvoice />

        <section id="how" className={s.steps}>
          {STEPS.map((st) => (
            <div key={st.title} className={s.step}>
              <span className={`${s.stepIcon} ${st.tone === "blue" ? s.blue : ""}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={st.d} />
                </svg>
              </span>
              <div>
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className={s.math}>
          <p className={s.eyebrow}>How the math works</p>
          <h2>
            Hours × Rate + Parts + Tax = <em>Total due</em>
          </h2>
          <p>
            Every number comes from what you say. Your hourly and tax rates fill in automatically. If you don&apos;t say a price, it&apos;s flagged, never made up.
          </p>
        </section>

        <section id="pricing" className={s.priceBar}>
          <div className={s.amount}>
            $24<small> / month</small>
          </div>
          <div className={s.priceText}>
            <p>A simple, all-in price for solo contractors who want to turn job talk into paid invoices.</p>
            <ul>
              <li>Unlimited voice or typed job notes</li>
              <li>PDF invoices with your logo, emailed in one tap</li>
              <li>Paid / unpaid tracking · cancel anytime</li>
            </ul>
          </div>
          <span className={s.stripesSmall} aria-hidden="true" />
        </section>

        <section className={s.cta}>
          <h2>Stop writing invoices at night.</h2>
          <p className={s.lead}>Start with {FREE_NOTES_PER_MONTH} free job notes a month. No card needed.</p>
          <Link className={s.btn} href="/signup">
            Start free <Arrow />
          </Link>
        </section>

        <footer className={s.foot}>
          <span>© {new Date().getFullYear()} VoiceBill Pro · Springdale, Arkansas</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </footer>
      </div>
    </div>
  );
}
