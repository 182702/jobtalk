-- Each contractor's saved prices, learned from invoices they save.
-- When a later job note mentions the same item without a price, the app
-- reuses this price (and shows that it did) instead of leaving it blank.
create table if not exists public.price_list (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  name_key text not null,
  rate_cents integer not null check (rate_cents > 0),
  last_used_at timestamptz not null default now(),
  unique (user_id, name_key)
);

create index if not exists price_list_user_recent_idx on public.price_list (user_id, last_used_at desc);

alter table public.price_list enable row level security;

create policy "price_list: owner can read" on public.price_list
  for select using (auth.uid() = user_id);
create policy "price_list: owner can add" on public.price_list
  for insert with check (auth.uid() = user_id);
create policy "price_list: owner can update" on public.price_list
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "price_list: owner can delete" on public.price_list
  for delete using (auth.uid() = user_id);
