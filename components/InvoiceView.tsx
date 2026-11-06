import { businessName, formatDate, invoiceLabel, logoUrl } from "@/lib/invoice";
import { bpsToPercentString, formatCents, formatQuantity, lineAmountCents } from "@/lib/money";
import { t } from "@/lib/i18n";
import type { InvoiceWithItems, Profile } from "@/lib/types";
import { tr, type UiLang } from "@/lib/ui";

/** Read-only invoice layout, shared by the contractor view and the customer link. */
export function InvoiceView({
  invoice,
  profile,
  holdTotal = false,
  uiLang = "en",
}: {
  invoice: InvoiceWithItems;
  profile: Profile;
  holdTotal?: boolean;
  uiLang?: UiLang;
}) {
  const logo = logoUrl(profile.logo_path);
  const s = t(invoice.language);
  // Contractor's view: while a price is missing, don't present a final total.
  const missing = holdTotal ? invoice.line_items.filter((i) => !(i.rate_cents > 0)).length : 0;
  return (
    <div className="card paper">
      <div className="doc-head">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" />}
          <h2 style={{ margin: logo ? "8px 0 0" : 0, fontSize: 22 }}>{businessName(profile, s.yourBusiness)}</h2>
          <div className="muted small">{profile.email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, color: "var(--accent)" }}>{s.invoice.toUpperCase()} {invoiceLabel(invoice.number)}</div>
          <div className="muted small">{formatDate(invoice.issued_on, s.dateLocale)}</div>
          {invoice.status === "paid" && <span className="pill paid">{invoice.paid_via === "card" ? s.paidByCard : s.paid}</span>}
        </div>
      </div>

      <div style={{ margin: "16px 0" }}>
        <div className="muted small" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{s.billTo}</div>
        <b>{invoice.customer_name || s.customer}</b>
        {invoice.customer_email && <div className="muted small">{invoice.customer_email}</div>}
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>{s.item}</th>
              <th className="n">{s.qty}</th>
              <th className="n">{s.rate}</th>
              <th className="n">{s.amount}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td className="n">{formatQuantity(it.quantity)}</td>
                <td className="n" style={it.rate_cents > 0 ? undefined : { color: "var(--danger)" }}>{formatCents(it.rate_cents)}</td>
                <td className="n">{formatCents(lineAmountCents(it.quantity, it.rate_cents))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <table className="tot">
        <tbody>
          <tr>
            <td>{missing > 0 ? tr(uiLang, "Subtotal so far") : s.subtotal}</td>
            <td className="n">{formatCents(invoice.subtotal_cents)}</td>
          </tr>
          {invoice.tax_rate_bps > 0 && (
            <tr>
              <td>{s.tax} ({bpsToPercentString(invoice.tax_rate_bps)}%)</td>
              <td className="n">{missing > 0 ? "—" : formatCents(invoice.tax_cents)}</td>
            </tr>
          )}
          <tr className="grand">
            <td>{s.totalDue}</td>
            {missing > 0 ? (
              <td className="n" style={{ color: "var(--danger)", fontSize: 16 }}>
                {missing === 1 ? tr(uiLang, "1 price missing") : tr(uiLang, "{n} prices missing", { n: missing })}
              </td>
            ) : (
              <td className="n">{formatCents(invoice.total_cents)}</td>
            )}
          </tr>
        </tbody>
      </table>

      {invoice.notes && <p className="pre">{invoice.notes}</p>}
      {profile.payment_instructions && (
        <div style={{ marginTop: 14 }}>
          <div className="muted small" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{s.howToPay}</div>
          <div className="pre">{profile.payment_instructions}</div>
        </div>
      )}
      {!!invoice.signatures?.length && (
        <div className="sigs">
          <div className="muted small" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{s.signatures}</div>
          {invoice.signatures.map((sig) => (
            <div key={sig.kind} className="sig">
              <p>{s.signStatement[sig.kind]}</p>
              <span className="sigImg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sig.image} alt={s.signedBy(sig.signer_name, formatDate(sig.signed_on, s.dateLocale))} />
              </span>
              <small className="muted">{s.signedBy(sig.signer_name, formatDate(sig.signed_on, s.dateLocale))}</small>
            </div>
          ))}
        </div>
      )}
      <div className="foot">{s.madeWith}</div>
    </div>
  );
}
