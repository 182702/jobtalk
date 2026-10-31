-- Invoice language ('en' or 'es') so the customer-facing invoice, PDF and
-- email can be in Spanish. Safe to run on a live database: existing
-- invoices default to English.

alter table public.invoices
  add column if not exists language text not null default 'en'
  check (language in ('en', 'es'));

create or replace function public.create_invoice(p_invoice jsonb, p_items jsonb)
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
                        total_cents, notes, original_note, language)
  values (v_user, v_number,
          coalesce(p_invoice->>'customer_name', ''),
          coalesce(p_invoice->>'customer_email', ''),
          coalesce((p_invoice->>'issued_on')::date, current_date),
          (p_invoice->>'subtotal_cents')::integer,
          (p_invoice->>'tax_rate_bps')::integer,
          (p_invoice->>'tax_cents')::integer,
          (p_invoice->>'total_cents')::integer,
          coalesce(p_invoice->>'notes', ''),
          coalesce(p_invoice->>'original_note', ''),
          coalesce(p_invoice->>'language', 'en'))
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

create or replace function public.update_invoice(p_id uuid, p_invoice jsonb, p_items jsonb)
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
    language = coalesce(p_invoice->>'language', language),
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
