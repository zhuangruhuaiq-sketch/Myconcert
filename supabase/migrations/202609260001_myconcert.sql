-- Myconcert cloud-sync schema. Apply only after configuring a Supabase project.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "users manage their own Myconcert events" on public.events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
