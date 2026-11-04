export const metadata = { title: "Terms of service" };

// Plain-language starting point; worth a review by a lawyer as the business grows.
export default function TermsPage() {
  return (
    <main>
      <h1>Terms of service</h1>
      <p className="muted small">Last updated October 31, 2026. VoiceBill Pro is operated by Isaac Elanzo, Springdale, Arkansas, USA. Contact: <a href="mailto:support@voicebillpro.com">support@voicebillpro.com</a>.</p>
      <h2>The service</h2>
      <p>VoiceBill Pro helps you draft invoices from job notes. You are responsible for checking every invoice, including prices, quantities, and tax, before you send it. Extracted line items can be wrong.</p>
      <h2>Plans and billing</h2>
      <p>The Free plan includes 5 job notes per calendar month. The Solo plan is $24 per month, billed in advance through Stripe, and renews until you cancel. Cancel any time from the Billing page; access continues to the end of the paid period. No refunds for partial months.</p>
      <h2>Fair use</h2>
      <p>Don&apos;t misuse the service, including automated bulk requests, attempts to get around plan limits, or sending unwanted email to people who aren&apos;t your customers.</p>
      <h2>Your content</h2>
      <p>You own your notes and invoices. You give us permission to store and process them only to provide the service.</p>
      <h2>Liability</h2>
      <p>VoiceBill Pro is provided as is. To the extent the law allows, our liability is limited to what you paid us in the last 12 months.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Arkansas, USA.</p>
      <h2>Changes</h2>
      <p>We may update these terms and will tell you by email about material changes.</p>
    </main>
  );
}
