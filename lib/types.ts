export type Profile = {
  id: string;
  email: string;
  business_name: string;
  logo_path: string | null;
  hourly_rate_cents: number;
  tax_rate_bps: number;
  payment_instructions: string;
};

export type LineItem = {
  description: string;
  quantity: number;
  rate_cents: number;
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
};

export type InvoiceWithItems = Invoice & { line_items: LineItem[] };

/** What the AI parser returns and the review screen edits before saving. */
export type Draft = {
  customer_name: string;
  customer_email: string;
  issued_on: string;
  notes: string;
  original_note: string;
  tax_rate_bps: number;
  items: LineItem[];
};
