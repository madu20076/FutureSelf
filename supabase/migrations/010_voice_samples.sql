create table if not exists public.voice_samples (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  audio_url        text        not null,
  duration_seconds integer,
  file_type        text,
  created_at       timestamptz not null default now()
);

alter table public.voice_samples enable row level security;

create policy "Users can view own voice samples"
  on public.voice_samples for select
  using (auth.uid() = user_id);

create policy "Users can insert own voice samples"
  on public.voice_samples for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own voice samples"
  on public.voice_samples for delete
  using (auth.uid() = user_id);

-- Storage: futureself-voice bucket already exists (migration 009).
-- The existing upload/read/delete policies cover {userId}/samples/* paths
-- because they check (storage.foldername(name))[1] = auth.uid()::text,
-- which matches any path whose first segment is the user's ID.
-- No additional storage policies are needed.
