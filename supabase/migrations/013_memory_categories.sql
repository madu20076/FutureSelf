-- Expand memory_type categories and add UPDATE policy for editing

ALTER TABLE public.futureself_memories
  DROP CONSTRAINT IF EXISTS futureself_memories_type_check;

ALTER TABLE public.futureself_memories
  ADD CONSTRAINT futureself_memories_type_check
    CHECK (memory_type IN (
      'goal', 'preference', 'belief', 'lesson',
      'decision', 'personal_fact', 'communication_style',
      'challenge', 'win', 'relationship', 'project'
    ));

DROP POLICY IF EXISTS "Users can update own memories" ON public.futureself_memories;
CREATE POLICY "Users can update own memories"
  ON public.futureself_memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
