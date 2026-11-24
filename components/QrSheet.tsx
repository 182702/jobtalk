"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { formatCents } from "@/lib/money";
import type { InvoiceWithItems } from "@/lib/types";
import { balanceCents, paidCents } from "@/lib/payments";

/**
 * Full-screen QR code the contractor shows the customer. It opens the invoice
 * link, where the customer can pay by card. Wording is in the invoice's language.
 */
export function QrSheet({
  invoice,
  link,
  canPay,
  business,
  closeLabel,
  onClose,
}: {
  invoice: InvoiceWithItems;
  link: string;
  canPay: boolean;
  business: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const L = t(invoice.language);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setSvg).catch(() => setSvg(""));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [link, onClose]);

  return (
    <div className="qrSheet" role="dialog" aria-modal="true" aria-labelledby="qr-title" lang={invoice.language === "es" ? "es" : "en"}>
      <div className="qrInner">
        <p className="qrBiz">{business}</p>
        <h2 id="qr-title">{canPay ? L.scanToPay : L.scanToView}</h2>
        <p className="qrTotal">
          {paidCents(invoice.payments) > 0 ? L.balanceDue : L.totalDue}:{" "}
          <b>{formatCents(paidCents(invoice.payments) > 0 ? balanceCents(invoice) : invoice.total_cents)}</b>
        </p>
        {/* eslint-disable-next-line react/no-danger -- SVG generated locally from our own link */}
        <div className="qrCode" aria-label={canPay ? L.scanToPay : L.scanToView} role="img" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="qrHint">{L.scanHint}</p>
        <button type="button" className="qrClose" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
