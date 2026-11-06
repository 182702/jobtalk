export type Profile = {
  id: string;
  email: string;
  business_name: string;
  logo_path: string | null;
  hourly_rate_cents: number;
  tax_rate_bps: number;
  payment_instructions: string;
  signup_notified_at?: string | null; // absent before the 0004 migration
};

export type LineItem = {
  description: string;
  quantity: number;
  rate_cents: number;
  /** Set by the parser when the price came from the contractor's saved prices. Not stored. */
  price_from?: "saved";
};

export type Invoice = {
  id: string;
  number: number;
  customer_name: string;
  customer_email: string;
  issued_on: string; // YYYY-MM-DD
  status: "unpaid" | "paid";
  subtotal_cents: number;
  tax_rate_bps: number;
  tax_cents: number;
  total_cents: number;
  notes: string;
  original_note: string;
  public_token: string;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  language?: "en" | "es"; // absent on databases without the 0002 migration
};

export type SignatureKind = "approve" | "complete";

/** A customer's signature, drawn on the contractor's phone. */
export type Signature = {
  kind: SignatureKind;
  signer_name: string;
  image: string; // PNG data URL
  total_cents: number; // invoice total when signed
  signed_on: string; // YYYY-MM-DD, the signer's local date
};

export type InvoiceWithItems = Invoice & { line_items: LineItem[]; signatures?: Signature[] };

/** What the AI parser returns and the review screen edits before saving. */
export type Draft = {
  customer_name: string;
  customer_email: string;
  issued_on: string;
  notes: string;
  original_note: string;
  tax_rate_bps: number;
  language: "en" | "es";
  items: LineItem[];
};
