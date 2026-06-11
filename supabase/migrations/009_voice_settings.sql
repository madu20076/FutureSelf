-- Voice settings on futureself_profiles
alter table public.futureself_profiles
  add column if not exists voice_enabled boolean not null default false,
  add column if not exists voice_style   text    not null default 'calm',
  add column if not exists voice_provider text   not null default 'openai';

-- voice_generations table
create table if not exists public.voice_generations (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  chat_message_id uuid,
  audio_url       text        not null,
  text_used       text,
  created_at      timestamptz not null default now()
);

alter table public.voice_generations enable row level security;

create policy "Users can view own voice generations"
  on public.voice_generations for select
  using (auth.uid() = user_id);

create policy "Users can insert own voice generations"
  on public.voice_generations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own voice generations"
  on public.voice_generations for delete
  using (auth.uid() = user_id);

-- Storage bucket for audio files
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('futureself-voice', 'futureself-voice', true)
  on conflict (id) do nothing;
end $$;

create policy "Users can upload own voice audio"
  on storage.objects for insert
  with check (
    bucket_id = 'futureself-voice'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Voice audio is publicly readable"
  on storage.objects for select
  using (bucket_id = 'futureself-voice');

create policy "Users can delete own voice audio"
  on storage.objects for delete
  using (
    bucket_id = 'futureself-voice'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
