export const metadata = { title: "Privacy policy" };

// Plain-language starting point; worth a review by a lawyer as the business grows.
export default function PrivacyPage() {
  return (
    <main>
      <h1>Privacy policy</h1>
      <p className="muted small">
        Last updated November 7, 2026. VoiceBill Pro is operated by Isaac Elanzo, Springdale, Arkansas, USA. Contact:{" "}
        <a href="mailto:support@voicebillpro.com">support@voicebillpro.com</a>.
      </p>

      <h2>What we collect from contractors</h2>
      <ul>
        <li>Your account email and password (the password is stored hashed by our login provider; we never see it).</li>
        <li>Your business settings: business name, logo, hourly rate, tax rate, and payment instructions.</li>
        <li>The job notes you record or type, the invoices you create, and the prices the app remembers from your saved invoices.</li>
        <li>How many job notes you use each month, and your plan.</li>
        <li>Feedback you send us from the app.</li>
        <li>Your menu language choice, saved in a cookie on your device.</li>
      </ul>

      <h2>What we store about your customers</h2>
      <p>
        When you create invoices, we store your customers&apos; names and email addresses, and the invoice details. If your customer signs an
        invoice on your phone, we store the name they type, the signature they draw, the date, and the invoice total at the time of signing. If a
        customer pays by card, we store that the invoice was paid, the amount, and Stripe&apos;s payment reference. We handle this information on
        your behalf, to provide the service to you.
      </p>

      <h2>How we use it</h2>
      <p>
        To run VoiceBill Pro: turning job notes into invoices, emailing invoices and payment reminders you choose to send, letting your customers
        sign and pay, telling you when a customer pays, and billing your subscription. We don&apos;t sell your data or use it for advertising.
      </p>

      <h2>Emails we send</h2>
      <ul>
        <li>To your customers: the invoices you send, and, only if you turn on payment reminders, up to 3 reminders for an unpaid invoice.</li>
        <li>To you: sign-in links, and a notice when a customer pays by card.</li>
        <li>To us: a notice when someone creates an account, so we can welcome new users.</li>
      </ul>

      <h2>Card payments</h2>
      <p>
        Card payments are handled by Stripe. If you connect Stripe, Stripe collects your identity and bank details directly; VoiceBill Pro stores
        only your Stripe account ID and whether it can take payments. Your customers enter their card details on Stripe&apos;s page. We never see
        full card numbers.
      </p>

      <h2>The home page demo</h2>
      <p>
        If you try the demo on our home page, the text you type is sent to our AI provider to make the example invoice, and is not saved. To limit
        how often the demo can be used, we store a scrambled code made from your internet address (never the address itself) for up to 2 days.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li>Supabase: database, login, and file storage.</li>
        <li>Anthropic: job note text is sent to their API to extract line items.</li>
        <li>Resend: delivers emails.</li>
        <li>Stripe: subscription payments, and card payments from your customers to your own Stripe account.</li>
        <li>Vercel: hosts the app, and measures page visits with Vercel Analytics, which doesn&apos;t use cookies.</li>
      </ul>

      <h2>Voice</h2>
      <p>
        Speech is turned into text by your browser&apos;s built-in speech recognition, which may use your browser maker&apos;s servers.
        VoiceBill Pro stores the text, not audio.
      </p>

      <h2>Invoice links</h2>
      <p>Each invoice has a private link that anyone holding it can open. Share it only with your customer.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account is open. Deleting an invoice deletes its line items and signatures. Records used only to limit AI
        use are deleted after 2 days.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or delete invoices, remove saved prices, turn reminders off, and disconnect Stripe at any time. To delete your account and
        data, email <a href="mailto:support@voicebillpro.com">support@voicebillpro.com</a>. If you are a contractor&apos;s customer and want your
        information removed, contact the contractor who invoiced you, or email us.
      </p>

      <h2>Who it&apos;s for</h2>
      <p>VoiceBill Pro is for businesses and isn&apos;t meant for anyone under 18.</p>

      <h2>Changes</h2>
      <p>If we make important changes to this policy, we&apos;ll tell account holders by email.</p>
    </main>
  );
}
