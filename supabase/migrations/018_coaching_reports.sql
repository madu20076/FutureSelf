-- AI coaching reports — one active report per user, replaced on each generation
CREATE TABLE IF NOT EXISTS public.futureself_coaching_reports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_json jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS futureself_coaching_reports_user_idx
  ON public.futureself_coaching_reports (user_id, created_at DESC);

ALTER TABLE public.futureself_coaching_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coaching reports"
  ON public.futureself_coaching_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coaching reports"
  ON public.futureself_coaching_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own coaching reports"
  ON public.futureself_coaching_reports FOR DELETE
  USING (auth.uid() = user_id);
