-- Automatic payment reminders. Off until the contractor turns them on.
-- A daily job (app/api/cron/reminders) emails customers about sent, unpaid invoices 3, 7 and 14 days after sending.
alter table public.profiles add column if not exists reminders_enabled boolean not null default false;
alter table public.invoices add column if not exists reminders_sent smallint not null default 0;
alter table public.invoices add column if not exists last_reminder_at timestamptz;
alter table public.invoices add column if not exists reminders_off boolean not null default false;
grant update (reminders_enabled) on public.profiles to authenticated;
grant update (reminders_off) on public.invoices to authenticated;
create index if not exists invoices_reminder_idx on public.invoices (sent_at) where status = 'unpaid' and reminders_off = false and reminders_sent < 3;
