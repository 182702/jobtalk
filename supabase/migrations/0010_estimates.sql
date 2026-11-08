-- Estimates: a document can be an estimate (quote) and later be turned into an invoice with the same number.
alter table public.invoices add column if not exists doc_type text not null default 'invoice' check (doc_type in ('invoice', 'estimate'));
grant update (doc_type) on public.invoices to authenticated;
