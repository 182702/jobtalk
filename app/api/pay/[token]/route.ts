import { NextResponse } from "next/server";
import { canPayByCard, checkoutUrl } from "@/lib/card-payments";
import { appUrl } from "@/lib/env";
import { t } from "@/lib/i18n";
import { loadPublicInvoice } from "@/lib/load-invoice";

/** The customer taps "Pay by card" on the invoice link: send them to Stripe Checkout. */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await loadPublicInvoice(token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const L = t(found.invoice.language);
  if (found.invoice.status === "paid") return NextResponse.json({ url: `${appUrl()}/i/${token}` });
  if (!canPayByCard(found.invoice, found.profile)) return NextResponse.json({ error: L.payUnavailable }, { status: 400 });
  try {
    return NextResponse.json({ url: await checkoutUrl(found.invoice, found.profile) });
  } catch (err) {
    console.error("pay: checkout failed", err);
    return NextResponse.json({ error: L.payUnavailable }, { status: 502 });
  }
}
