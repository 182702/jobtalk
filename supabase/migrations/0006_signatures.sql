-- Customer signatures captured on the contractor's phone.
-- kind 'approve': before the job, the customer agrees to the work and prices.
-- kind 'complete': after the job, the customer confirms the work is done.
-- Editing an invoice deletes its signatures (the API does this), so a
-- signature always matches the invoice as it is.
create table public.invoice_signatures (
  id bigint generated always as identity primary key,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('approve', 'complete')),
  signer_name text not null check (char_length(signer_name) between 1 and 120),
  image text not null check (image like 'data:image/png;base64,%' and char_length(image) <= 300000),
  total_cents integer not null check (total_cents >= 0),
  signed_on date not null,
  created_at timestamptz not null default now(),
  unique (invoice_id, kind)
);

create index invoice_signatures_invoice_idx on public.invoice_signatures (invoice_id);

alter table public.invoice_signatures enable row level security;

create policy "invoice_signatures: owner can read" on public.invoice_signatures
  for select using (auth.uid() = user_id);
create policy "invoice_signatures: owner can add to own invoices" on public.invoice_signatures
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid())
  );
create policy "invoice_signatures: owner can delete" on public.invoice_signatures
  for delete using (auth.uid() = user_id);

-- No updates: a signature is replaced by deleting it and signing again.
revoke update on public.invoice_signatures from authenticated, anon;
