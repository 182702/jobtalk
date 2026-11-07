-- Home page "Try it now" demo: limits AI use by anonymous visitors. Server-only.
create table if not exists public.demo_requests (id bigint generated always as identity primary key, ip_hash text not null, created_at timestamptz not null default now());
create index if not exists demo_requests_time_idx on public.demo_requests (created_at desc);
alter table public.demo_requests enable row level security;
create or replace function public.check_demo_limit(p_ip text, p_per_ip_day integer, p_global_day integer) returns boolean language plpgsql security definer set search_path = public as $$ declare v_ip integer; v_all integer; begin perform pg_advisory_xact_lock(hashtext('demo_requests')); select count(*) filter (where ip_hash = p_ip), count(*) into v_ip, v_all from demo_requests where created_at > now() - interval '1 day'; if v_ip >= p_per_ip_day or v_all >= p_global_day then return false; end if; insert into demo_requests (ip_hash) values (p_ip); delete from demo_requests where created_at < now() - interval '2 days'; return true; end; $$;
revoke execute on function public.check_demo_limit(text, integer, integer) from public, anon, authenticated;
