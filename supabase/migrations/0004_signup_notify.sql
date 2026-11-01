-- Remembers which accounts the owner has already been emailed about, so
-- each new sign-up triggers exactly one "new sign-up" email. Users can't
-- write this column (it isn't in the profiles column grant).
alter table public.profiles
  add column if not exists signup_notified_at timestamptz;

-- Existing accounts count as already announced.
update public.profiles set signup_notified_at = now() where signup_notified_at is null;
