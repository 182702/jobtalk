-- In-app feedback from contractors. Written and read only by the server
-- (service role); users can't read each other's feedback.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  email text not null default '',
  page text not null default '',
  mood text check (mood in ('happy', 'meh', 'unhappy')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;
-- No policies: only the service role reads or writes this table.
