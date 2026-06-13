-- Beta feedback submissions

CREATE TABLE IF NOT EXISTS public.futureself_feedback (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  rating     smallint    CHECK (rating BETWEEN 1 AND 5),
  category   text        CHECK (category IN ('bug', 'feature', 'ux', 'performance', 'other')),
  feedback   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.futureself_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_feedback"
  ON public.futureself_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_select_own_feedback"
  ON public.futureself_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS futureself_feedback_user_created_idx
  ON public.futureself_feedback (user_id, created_at DESC);
