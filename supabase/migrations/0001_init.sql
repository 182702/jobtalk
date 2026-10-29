-- VoiceBill Pro schema. Run in the Supabase SQL editor or with `supabase db push`.
-- All money is stored as integer cents. Tax rates are stored as basis points
-- (825 = 8.25%). Quantities are numeric with two decimals (2.5 hours).

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, editable by its owner.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  business_name text not null default '',
  logo_path text,
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0),
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 10000),
  payment_instructions text not null default '',
  next_invoice_number integer not null default 1 check (next_invoice_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read" on public.profiles
  for select using (auth.uid() = id);

-- Owners can update their settings but not the invoice counter (that only
-- moves through create_invoice below).
create policy "profiles: owner can update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from authenticated, anon;
grant update (business_name, logo_path, hourly_rate_cents, tax_rate_bps,
              payment_instructions, updated_at)
  on public.profiles to authenticated;

-- Create a profile whenever someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Subscriptions: plan and Stripe ids. Read-only for the owner; only the
-- server (service role, via the Stripe webhook) writes here.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'solo')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: owner can read" on public.subscriptions
  for select using (auth.uid() = user_id);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Invoices and line items.
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  number integer not null,
  customer_name text not null default '',
  customer_email text not null default '',
  issued_on date not null default current_date,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 10000),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  notes text not null default '',
  original_note text not null default '',
  -- Unguessable id for the customer-facing link (/i/<token>).
  public_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create index invoices_user_created_idx on public.invoices (user_id, created_at desc);

alter table public.invoices enable row level security;

create policy "invoices: owner can read" on public.invoices
  for select using (auth.uid() = user_id);
create policy "invoices: owner can update" on public.invoices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices: owner can delete" on public.invoices
  for delete using (auth.uid() = user_id);
-- No insert policy: invoices are created through create_invoice so the
-- number is always assigned by the counter.

revoke update on public.invoices from authenticated, anon;
grant update (customer_name, customer_email, issued_on, status, subtotal_cents,
              tax_rate_bps, tax_cents, total_cents, notes, sent_at, paid_at,
              updated_at)
  on public.invoices to authenticated;

create table public.line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position integer not null default 0,
  description text not null default '',
  quantity numeric(12, 2) not null default 1 check (quantity >= 0),
  rate_cents integer not null default 0 check (rate_cents >= 0)
);

create index line_items_invoice_idx on public.line_items (invoice_id, position);

alter table public.line_items enable row level security;

create policy "line_items: owner can do anything" on public.line_items
  for all
  using (exists (select 1 from public.invoices i
                 where i.id = invoice_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.invoices i
                      where i.id = invoice_id and i.user_id = auth.uid()));

-- Creates an invoice with the next sequential number and its line items in
-- one transaction. Security definer (the counter column is not client-writable),
-- scoped to auth.uid() so a user can only create their own invoices.
-- p_invoice: {customer_name, customer_email, issued_on, subtotal_cents,
--             tax_rate_bps, tax_cents, total_cents, notes, original_note}
-- p_items:   [{description, quantity, rate_cents}, ...]
create function public.create_invoice(p_invoice jsonb, p_items jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_number integer;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  update profiles set next_invoice_number = next_invoice_number + 1
    where id = v_user
    returning next_invoice_number - 1 into v_number;

  if v_number is null then
    raise exception 'profile missing';
  end if;

  insert into invoices (user_id, number, customer_name, customer_email,
                        issued_on, subtotal_cents, tax_rate_bps, tax_cents,
                        total_cents, notes, original_note)
  values (v_user, v_number,
          coalesce(p_invoice->>'customer_name', ''),
          coalesce(p_invoice->>'customer_email', ''),
          coalesce((p_invoice->>'issued_on')::date, current_date),
          (p_invoice->>'subtotal_cents')::integer,
          (p_invoice->>'tax_rate_bps')::integer,
          (p_invoice->>'tax_cents')::integer,
          (p_invoice->>'total_cents')::integer,
          coalesce(p_invoice->>'notes', ''),
          coalesce(p_invoice->>'original_note', ''))
  returning id into v_id;

  insert into line_items (invoice_id, position, description, quantity, rate_cents)
  select v_id, (ord - 1)::integer,
         coalesce(item->>'description', ''),
         (item->>'quantity')::numeric,
         (item->>'rate_cents')::integer
  from jsonb_array_elements(p_items) with ordinality as t(item, ord);

  return v_id;
end;
$$;

-- Replaces an invoice's fields and line items in one transaction.
create function public.update_invoice(p_id uuid, p_invoice jsonb, p_items jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update invoices set
    customer_name = coalesce(p_invoice->>'customer_name', ''),
    customer_email = coalesce(p_invoice->>'customer_email', ''),
    issued_on = coalesce((p_invoice->>'issued_on')::date, issued_on),
    subtotal_cents = (p_invoice->>'subtotal_cents')::integer,
    tax_rate_bps = (p_invoice->>'tax_rate_bps')::integer,
    tax_cents = (p_invoice->>'tax_cents')::integer,
    total_cents = (p_invoice->>'total_cents')::integer,
    notes = coalesce(p_invoice->>'notes', ''),
    updated_at = now()
  where id = p_id and user_id = auth.uid();

  if not found then
    raise exception 'invoice not found';
  end if;

  delete from line_items where invoice_id = p_id;

  insert into line_items (invoice_id, position, description, quantity, rate_cents)
  select p_id, (ord - 1)::integer,
         coalesce(item->>'description', ''),
         (item->>'quantity')::numeric,
         (item->>'rate_cents')::integer
  from jsonb_array_elements(p_items) with ordinality as t(item, ord);
end;
$$;

revoke execute on function public.create_invoice(jsonb, jsonb) from public, anon;
revoke execute on function public.update_invoice(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_invoice(jsonb, jsonb) to authenticated;
grant execute on function public.update_invoice(uuid, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Usage (free plan limit) and AI rate limiting. Server-only writes.
-- ---------------------------------------------------------------------------
create table public.usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  notes_used integer not null default 0 check (notes_used >= 0),
  primary key (user_id, month)
);

alter table public.usage enable row level security;

create policy "usage: owner can read" on public.usage
  for select using (auth.uid() = user_id);

-- Counts one note against this month's usage. Returns the new count, or
-- null if p_limit is set and already reached. Atomic under concurrency.
create function public.consume_note(p_user uuid, p_limit integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_used integer;
begin
  insert into usage (user_id, month) values (p_user, v_month)
    on conflict do nothing;

  update usage set notes_used = notes_used + 1
    where user_id = p_user and month = v_month
      and (p_limit is null or notes_used < p_limit)
    returning notes_used into v_used;

  return v_used;
end;
$$;

-- Gives a note back when the AI call fails, so errors don't eat the quota.
create function public.refund_note(p_user uuid)
returns void
language sql security definer set search_path = public as $$
  update usage set notes_used = greatest(notes_used - 1, 0)
    where user_id = p_user and month = date_trunc('month', now())::date;
$$;

create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_requests_user_time_idx on public.ai_requests (user_id, created_at desc);

alter table public.ai_requests enable row level security;
-- No policies: only the service role touches this table.

-- Records a request and returns true if the user is within both limits
-- (per minute and per day). Blocked requests are not recorded.
create function public.check_rate_limit(p_user uuid, p_per_minute integer, p_per_day integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_minute integer;
  v_day integer;
begin
  -- Serialize per user so concurrent requests can't both slip under the limit.
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  select count(*) filter (where created_at > now() - interval '1 minute'),
         count(*)
    into v_minute, v_day
    from ai_requests
    where user_id = p_user and created_at > now() - interval '1 day';

  if v_minute >= p_per_minute or v_day >= p_per_day then
    return false;
  end if;

  insert into ai_requests (user_id) values (p_user);
  delete from ai_requests where user_id = p_user and created_at < now() - interval '2 days';
  return true;
end;
$$;

revoke execute on function public.consume_note(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_note(uuid) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(uuid, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Waitlist from the landing page. Server-only writes.
-- ---------------------------------------------------------------------------
create table public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  trade text not null default '',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- ---------------------------------------------------------------------------
-- Logo storage: public bucket, each user writes only under their own folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Reads through the public URL skip RLS; this policy lets the owner's own
-- upload requests see the row they write.
create policy "logos: owner can read" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: owner can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: owner can update" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: owner can delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
