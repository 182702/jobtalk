import Link from "next/link";

export const metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <main>
      <h1>Support</h1>
      <p className="sub">Questions about VoiceBill Pro or a charge? We&apos;re here to help.</p>
      <div className="card">
        <h2>Contact us</h2>
        <p style={{ margin: 0 }}>
          Email <a href="mailto:support@voicebillpro.com">support@voicebillpro.com</a>. We reply within 1 to 2 business days.
        </p>
      </div>
      <div className="card">
        <h2>Billing</h2>
        <p>
          The Solo plan is $24 per month and shows on your card statement as <b>VOICEBILL PRO</b>. You can update your card or cancel any time from{" "}
          <Link href="/billing">Billing</Link>. Access continues until the end of the period you paid for.
        </p>
        <p style={{ margin: 0 }}>
          Received an invoice from a contractor? Questions about that invoice go to the contractor who sent it. Just reply to their email.
        </p>
      </div>
      <div className="card">
        <h2>Account and data</h2>
        <p style={{ margin: 0 }}>
          To delete your account and data, email us from the address you signed up with. See our <Link href="/privacy">privacy policy</Link> and{" "}
          <Link href="/terms">terms</Link>.
        </p>
      </div>
    </main>
  );
}
