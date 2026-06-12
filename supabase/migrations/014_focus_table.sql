-- Today's Focus table: stores AI-generated daily focus items per user
CREATE TABLE IF NOT EXISTS public.futureself_focus (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_text text        NOT NULL,
  completed  boolean     NOT NULL DEFAULT false,
  focus_date date        NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS futureself_focus_user_date_idx
  ON public.futureself_focus (user_id, focus_date);

ALTER TABLE public.futureself_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own focus"
  ON public.futureself_focus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus"
  ON public.futureself_focus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus"
  ON public.futureself_focus FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus"
  ON public.futureself_focus FOR DELETE
  USING (auth.uid() = user_id);
