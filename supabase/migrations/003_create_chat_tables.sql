-- Migration 003: chat_sessions and chat_messages tables
-- Stores all AI chat conversations.

create table if not exists public.chat_sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);

drop trigger if exists set_chat_sessions_updated_at on public.chat_sessions;
create trigger set_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute procedure public.set_updated_at();

alter table public.chat_sessions enable row level security;

create policy "Users can view own chat sessions"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat sessions"
  on public.chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chat sessions"
  on public.chat_sessions for update
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────

create table if not exists public.chat_messages (
  id         uuid        primary key default gen_random_uuid(),
  session_id uuid        not null references public.chat_sessions (id) on delete cascade,
  role       text        not null check (role in ('user', 'assistant')),
  content    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id);

alter table public.chat_messages enable row level security;

create policy "Users can view messages in own sessions"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
        and user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own sessions"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
        and user_id = auth.uid()
    )
  );
