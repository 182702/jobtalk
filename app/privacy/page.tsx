export const metadata = { title: "Privacy policy" };

// DRAFT: have this reviewed before launch, and fill in the bracketed parts.
export default function PrivacyPage() {
  return (
    <main>
      <h1>Privacy policy</h1>
      <p className="muted small">Last updated [DATE]. Contact: [CONTACT EMAIL].</p>
      <h2>What we collect</h2>
      <p>Your account email and password (stored hashed by our auth provider), your business settings and logo, the job notes you record or type, and the invoices you create, including your customers&apos; names and email addresses.</p>
      <h2>How we use it</h2>
      <p>To run VoiceBill Pro: turning job notes into invoices, emailing invoices you choose to send, and billing your subscription. We don&apos;t sell your data or use it for advertising.</p>
      <h2>Who processes it</h2>
      <ul>
        <li>Supabase: database, login, and file storage.</li>
        <li>Anthropic: job note text is sent to their API to extract line items.</li>
        <li>Resend: delivers the invoice emails you send.</li>
        <li>Stripe: handles subscription payments. We never see your full card number.</li>
        <li>Vercel: hosts the app.</li>
      </ul>
      <h2>Voice</h2>
      <p>Speech is turned into text by your browser&apos;s built-in speech recognition, which may use your browser maker&apos;s servers. VoiceBill Pro stores the text, not audio.</p>
      <h2>Invoice links</h2>
      <p>Each invoice has a private link that anyone holding it can open. Share it only with your customer.</p>
      <h2>Your choices</h2>
      <p>You can edit or delete invoices at any time. To delete your account and data, email [CONTACT EMAIL].</p>
    </main>
  );
}
