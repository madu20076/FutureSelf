-- Migration 002: futureself_profiles table
-- Stores the generated FutureSelf identity derived from onboarding answers.
-- One row per user (enforced via unique constraint on user_id).

create table if not exists public.futureself_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  display_name        text,
  personality_summary text,
  tone                text,
  boundaries          text,
  onboarding          jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint futureself_profiles_user_id_unique unique (user_id)
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_futureself_profiles_updated_at on public.futureself_profiles;
create trigger set_futureself_profiles_updated_at
  before update on public.futureself_profiles
  for each row execute procedure public.set_updated_at();

-- Row-level security
alter table public.futureself_profiles enable row level security;

create policy "Users can view own futureself profile"
  on public.futureself_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own futureself profile"
  on public.futureself_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own futureself profile"
  on public.futureself_profiles for update
  using (auth.uid() = user_id);
