-- Payments recorded against an invoice: deposits, partial payments, cash/Zelle/check, and card payments.
create table if not exists public.invoice_payments (id bigint generated always as identity primary key, invoice_id uuid not null references public.invoices (id) on delete cascade, user_id uuid not null default auth.uid() references auth.users (id) on delete cascade, amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000000), method text not null check (method in ('cash', 'check', 'zelle', 'venmo', 'cashapp', 'bank', 'card', 'other')), paid_on date not null, note text not null default '' check (char_length(note) <= 200), stripe_session_id text unique, created_at timestamptz not null default now());
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id);
alter table public.invoice_payments enable row level security;
create policy "invoice_payments: owner can read" on public.invoice_payments for select using (auth.uid() = user_id);
create policy "invoice_payments: owner can add to own invoices" on public.invoice_payments for insert with check (auth.uid() = user_id and stripe_session_id is null and exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()));
create policy "invoice_payments: owner can delete" on public.invoice_payments for delete using (auth.uid() = user_id);
revoke update on public.invoice_payments from authenticated, anon;
