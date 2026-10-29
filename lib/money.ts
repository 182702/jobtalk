// All money math happens in integer cents. Quantities are tracked in
// hundredths (2.5 hours = 250) so line amounts never touch floating point
// beyond a single rounding step.

export type LineInput = {
  description: string;
  quantity: number; // e.g. 2.5
  rate_cents: number; // integer cents
};

export type Totals = {
  lines: { amount_cents: number }[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
};

/** Converts a quantity like 2.5 to hundredths (250), clamped to >= 0. */
export function toHundredths(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0) return 0;
  return Math.round(quantity * 100);
}

/** Rounds half away from zero; inputs here are never negative. */
function roundDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export function lineAmountCents(quantity: number, rateCents: number): number {
  const rate = Math.max(0, Math.round(rateCents));
  return roundDiv(toHundredths(quantity) * rate, 100);
}

/** Tax is computed once on the subtotal, at the rate in basis points. */
export function computeTotals(lines: LineInput[], taxRateBps: number): Totals {
  const amounts = lines.map((l) => ({ amount_cents: lineAmountCents(l.quantity, l.rate_cents) }));
  const subtotal = amounts.reduce((s, l) => s + l.amount_cents, 0);
  const bps = Math.min(10000, Math.max(0, Math.round(taxRateBps)));
  const tax = roundDiv(subtotal * bps, 10000);
  return { lines: amounts, subtotal_cents: subtotal, tax_cents: tax, total_cents: subtotal + tax };
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, "0")}`;
}

/** Parses user input like "85", "$1,200.50" into cents. Invalid -> 0. */
export function parseDollarsToCents(input: string | number): number {
  const s = String(input).replace(/[$,\s]/g, "");
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return 0;
  const [whole, frac = ""] = s.split(".");
  return Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2)) + (Number(frac[2] ?? "0") >= 5 ? 1 : 0);
}

export function centsToDollarString(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

/** "8.25" -> 825 basis points. */
export function parsePercentToBps(input: string | number): number {
  const s = String(input).replace(/[%\s]/g, "");
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return 0;
  return Math.min(10000, Math.round(Number(s) * 100));
}

export function bpsToPercentString(bps: number): string {
  return String(Math.round(bps) / 100);
}

/** Quantity display: drops trailing zeros (2.50 -> 2.5, 3.00 -> 3). */
export function formatQuantity(quantity: number): string {
  return String(toHundredths(quantity) / 100);
}
