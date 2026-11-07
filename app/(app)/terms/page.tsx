export const metadata = { title: "Terms of service" };

// Plain-language starting point; worth a review by a lawyer as the business grows.
export default function TermsPage() {
  return (
    <main>
      <h1>Terms of service</h1>
      <p className="muted small">
        Last updated November 7, 2026. VoiceBill Pro is operated by Isaac Elanzo, Springdale, Arkansas, USA. Contact:{" "}
        <a href="mailto:support@voicebillpro.com">support@voicebillpro.com</a>.
      </p>

      <h2>The service</h2>
      <p>
        VoiceBill Pro helps you draft invoices from job notes. You are responsible for checking every invoice, including prices, quantities, and
        tax, before you send it. Extracted line items can be wrong. You are responsible for using the correct tax rate for your work and location.
      </p>

      <h2>Plans and billing</h2>
      <p>
        The Free plan includes 5 job notes per calendar month. The Solo plan is $24 per month, billed in advance through Stripe, and renews until
        you cancel. Cancel any time from the Billing page; access continues to the end of the paid period. No refunds for partial months.
      </p>

      <h2>Customer signatures</h2>
      <p>
        You can let a customer sign an invoice on your device to approve the work and prices, or to confirm the work is done. Signatures are a
        record of what your customer agreed to in the app. We don&apos;t promise that a signature will be accepted as legally binding in every
        situation; that depends on your agreement with your customer and the law where you work. Editing an invoice removes its signatures.
      </p>

      <h2>Card payments</h2>
      <p>
        If you connect a Stripe account, your customers can pay your invoices by card. Payments go directly to your Stripe account. You agree to
        Stripe&apos;s terms, including the{" "}
        <a href="https://stripe.com/legal/connect-account" target="_blank" rel="noopener">
          Stripe Connected Account Agreement
        </a>
        , and Stripe&apos;s fees apply. VoiceBill Pro does not hold your money and does not currently charge a fee on card payments; we will tell
        you before that changes. Refunds, disputes, and chargebacks are between you, your customer, and Stripe. An invoice&apos;s paid status
        depends on Stripe telling us about the payment and may take a moment to update.
      </p>

      <h2>Payment reminders</h2>
      <p>
        Payment reminders are off until you turn them on. When on, we email your customers about invoices you sent that are still marked unpaid.
        Mark invoices paid promptly, including cash and check payments, so customers who already paid aren&apos;t reminded.
      </p>

      <h2>Your customers</h2>
      <p>
        Only add customers you actually work with. You are responsible for the invoices, reminders, and payment requests sent to your customers
        through the app.
      </p>

      <h2>Fair use</h2>
      <p>
        Don&apos;t misuse the service, including automated bulk requests, attempts to get around plan or demo limits, fraudulent invoices or
        payments, or sending unwanted email to people who aren&apos;t your customers. We may suspend accounts that do.
      </p>

      <h2>Your content</h2>
      <p>You own your notes and invoices. You give us permission to store and process them only to provide the service.</p>

      <h2>Liability</h2>
      <p>
        VoiceBill Pro is provided as is. To the extent the law allows, our liability is limited to what you paid us in the last 12 months.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Arkansas, USA.</p>

      <h2>Changes</h2>
      <p>We may update these terms and will tell you by email about material changes.</p>
    </main>
  );
}
