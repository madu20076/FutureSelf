-- Add voice cloning metadata to voice_samples.
-- clone_voice_id: ID returned by the cloning provider once processing completes.
-- clone_provider: Which provider handled the clone ('elevenlabs', 'cartesia', etc.).
-- clone_status:   Workflow state — starts as 'pending', advances to 'processing' /
--                 'ready' / 'failed' as the provider processes the sample.

alter table public.voice_samples
  add column if not exists clone_voice_id text,
  add column if not exists clone_provider text,
  add column if not exists clone_status   text not null default 'pending';
