-- ── Phase 7: FutureSelf Memory System ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.futureself_memories (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.profiles(id)            ON DELETE CASCADE,
  futureself_profile_id uuid                 REFERENCES public.futureself_profiles(id)  ON DELETE CASCADE,
  memory_type           text        NOT NULL
    CONSTRAINT futureself_memories_type_check
      CHECK (memory_type IN (
        'goal', 'preference', 'belief', 'lesson',
        'decision', 'personal_fact', 'communication_style'
      )),
  content               text        NOT NULL,
  importance            integer     NOT NULL DEFAULT 3
    CONSTRAINT futureself_memories_importance_check CHECK (importance BETWEEN 1 AND 5),
  source                text        NOT NULL DEFAULT 'chat',
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS futureself_memories_user_idx
  ON public.futureself_memories (user_id, importance DESC, created_at DESC);

ALTER TABLE public.futureself_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memories"
  ON public.futureself_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON public.futureself_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON public.futureself_memories FOR DELETE
  USING (auth.uid() = user_id);
