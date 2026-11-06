-- Card payments: each contractor connects their own Stripe account (Stripe Connect, Standard accounts).
-- Customers pay from the invoice link; the money goes to the contractor's account. Written only by the server.
alter table public.profiles add column if not exists stripe_account_id text unique;
alter table public.profiles add column if not exists card_payments_enabled boolean not null default false;
alter table public.invoices add column if not exists paid_via text check (paid_via in ('card'));
alter table public.invoices add column if not exists stripe_checkout_session_id text;
alter table public.invoices add column if not exists stripe_payment_intent_id text;
