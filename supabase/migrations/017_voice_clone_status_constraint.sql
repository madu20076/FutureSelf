-- Enforce valid clone_status values on voice_samples.
-- Valid states: pending -> processing -> ready | error
ALTER TABLE public.voice_samples
  DROP CONSTRAINT IF EXISTS voice_samples_clone_status_check;

ALTER TABLE public.voice_samples
  ADD CONSTRAINT voice_samples_clone_status_check
    CHECK (clone_status IN ('pending', 'processing', 'ready', 'error'));
