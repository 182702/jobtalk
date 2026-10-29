import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";
import s from "./landing.module.css";

export default function Landing() {
  return (
    <div className={s.wrap}>
      <header className={s.hero}>
        <h1>
          Talk through the job.
          <br />
          Get the invoice.
        </h1>
        <p className={s.lead}>
          Finish a job, hit record, and say what you did. JobTalk turns your voice note into labor hours, parts, and tax, ready to send.
        </p>
        <div className="btns" style={{ maxWidth: 420 }}>
          <Link className="btn" href="/signup">Try it free</Link>
          <a className="btn alt" href="#join">Join the waitlist</a>
        </div>
        <p className="muted small">Built for plumbers, electricians, HVAC techs, handymen, and anyone who bills by the job.</p>
      </header>

      <section className={s.section}>
        <h2>How it works</h2>
        <div className={`${s.steps} ${s.steps3}`}>
          <div className="card"><span className={s.num}>1</span><b style={{ display: "block" }}>Record</b><p className="muted" style={{ margin: 0 }}>Talk the way you normally would, in the truck or on site. No forms.</p></div>
          <div className="card"><span className={s.num}>2</span><b style={{ display: "block" }}>Review</b><p className="muted" style={{ margin: 0 }}>Hours, parts, and prices are pulled out and the math is done. Fix anything in a tap.</p></div>
          <div className="card"><span className={s.num}>3</span><b style={{ display: "block" }}>Send</b><p className="muted" style={{ margin: 0 }}>Email a clean PDF invoice to your customer, or copy the text into a message.</p></div>
        </div>
      </section>

      <section className={s.section}>
        <h2>From a voice note to numbers</h2>
        <div className={s.steps}>
          <div className="card">
            <div className={s.label}>What you say</div>
            <p className={s.quote}>
              “Replaced the water heater at the Alvarez place. Two and a half hours at eighty-five an hour. Forty-gallon heater, three hundred eighty dollars, and two shutoff valves at twelve each.”
            </p>
          </div>
          <div className="card">
            <div className={s.label}>What you get</div>
            <table>
              <tbody>
                <tr><td>Labor · 2.5 h × $85.00</td><td className="n">$212.50</td></tr>
                <tr><td>40-gallon water heater</td><td className="n">$380.00</td></tr>
                <tr><td>Shutoff valve · 2 × $12.00</td><td className="n">$24.00</td></tr>
                <tr><td>Subtotal</td><td className="n">$616.50</td></tr>
                <tr><td>Tax (8.25%)</td><td className="n">$50.86</td></tr>
                <tr className="grand"><td>Total due</td><td className="n">$667.36</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="muted small">Example for illustration. Your rates and tax rate apply.</p>
      </section>

      <section className={s.section}>
        <h2>Why you’ll like it</h2>
        <ul className={s.checks}>
          <li>No more writing invoices at night. Do it in two minutes while the job is fresh.</li>
          <li>Never forget a part or an hour you could have billed.</li>
          <li>Nothing is guessed. If you don’t say a price, it’s flagged in red for you to fill in.</li>
          <li>Set your hourly rate, tax rate, logo, and payment details once.</li>
          <li>See what’s paid and what’s still owed at a glance.</li>
        </ul>
      </section>

      <section className={s.section} id="pricing">
        <h2>Simple pricing</h2>
        <div className={s.plans}>
          <div className="card">
            <b>Free</b>
            <div className={s.price}>$0</div>
            <ul><li>5 job notes a month</li><li>Hours, parts, and tax</li><li>Email and PDF invoices</li></ul>
            <Link className="btn alt" href="/signup" style={{ width: "100%", marginTop: 14 }}>Start free</Link>
          </div>
          <div className={`card ${s.pop}`}>
            <b>Solo</b>
            <div className={s.price}>$24<small>/month</small></div>
            <ul><li>Unlimited job notes</li><li>Your logo on invoices</li><li>Paid and unpaid tracking</li></ul>
            <Link className="btn" href="/signup" style={{ width: "100%", marginTop: 14 }}>Get Solo</Link>
          </div>
          <div className="card">
            <b>Crew</b>
            <div className={s.price}>Later</div>
            <ul><li>Everything in Solo</li><li>Add your team</li><li>Coming after launch</li></ul>
            <a className="btn alt" href="#join" style={{ width: "100%", marginTop: 14 }}>Notify me</a>
          </div>
        </div>
      </section>

      <section className={`${s.section} ${s.cta}`} id="join">
        <h2>Be first in line</h2>
        <p className={s.lead} style={{ margin: "0 auto 20px" }}>Leave your email and we’ll reach out as new features land.</p>
        <WaitlistForm />
      </section>

      <footer className={s.foot}>
        <span>© {new Date().getFullYear()} JobTalk</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
