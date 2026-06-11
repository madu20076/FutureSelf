-- ── Phase 5: Public FutureSelf Profiles ─────────────────────────────────────

-- Add username + public flag to futureself_profiles
alter table public.futureself_profiles
  add column if not exists username  text unique,
  add column if not exists is_public boolean not null default false;

create unique index if not exists futureself_profiles_username_idx
  on public.futureself_profiles (lower(username))
  where username is not null;

-- Public-read policy: anyone can read profiles where is_public = true
-- (Existing owner SELECT policy is additive — RLS ORs multiple SELECT policies)
create policy "Public profiles are viewable by anyone"
  on public.futureself_profiles for select
  using (is_public = true);

-- ── Public chat tables ────────────────────────────────────────────────────────

create table if not exists public.public_chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.futureself_profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.public_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.public_chat_sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists public_chat_messages_session_idx
  on public.public_chat_messages (session_id, created_at);

-- RLS: public chat is open — anyone can create sessions and send messages
alter table public.public_chat_sessions  enable row level security;
alter table public.public_chat_messages  enable row level security;

create policy "Open"
  on public.public_chat_sessions for all
  using (true)
  with check (true);

create policy "Open"
  on public.public_chat_messages for all
  using (true)
  with check (true);
