import { businessName, formatDate, invoiceLabel, logoUrl } from "@/lib/invoice";
import { bpsToPercentString, formatCents, formatQuantity, lineAmountCents } from "@/lib/money";
import { t } from "@/lib/i18n";
import type { InvoiceWithItems, Profile } from "@/lib/types";

/** Read-only invoice layout, shared by the contractor view and the customer link. */
export function InvoiceView({ invoice, profile }: { invoice: InvoiceWithItems; profile: Profile }) {
  const logo = logoUrl(profile.logo_path);
  const s = t(invoice.language);
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
          {invoice.status === "paid" && <span className="pill paid">{s.paid}</span>}
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
            <td>{s.subtotal}</td>
            <td className="n">{formatCents(invoice.subtotal_cents)}</td>
          </tr>
          {invoice.tax_rate_bps > 0 && (
            <tr>
              <td>{s.tax} ({bpsToPercentString(invoice.tax_rate_bps)}%)</td>
              <td className="n">{formatCents(invoice.tax_cents)}</td>
            </tr>
          )}
          <tr className="grand">
            <td>{s.totalDue}</td>
            <td className="n">{formatCents(invoice.total_cents)}</td>
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
      <div className="foot">{s.madeWith}</div>
    </div>
  );
}
