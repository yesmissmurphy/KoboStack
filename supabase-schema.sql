-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run

create table if not exists substacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  name text,
  last_checked_at timestamptz,
  created_at timestamptz default now() not null,
  unique (user_id, url)
);

alter table substacks enable row level security;

create policy "Users can view their own substacks"
  on substacks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own substacks"
  on substacks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own substacks"
  on substacks for delete
  using (auth.uid() = user_id);
