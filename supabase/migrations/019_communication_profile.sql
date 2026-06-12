-- One communication style profile per user, upserted on each generation
CREATE TABLE IF NOT EXISTS public.futureself_communication_profile (
  user_id             uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  communication_style text,
  decision_style      text,
  motivation_style    text,
  leadership_style    text,
  planning_style      text,
  risk_tolerance      text,
  summary             text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.futureself_communication_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own communication profile"
  ON public.futureself_communication_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own communication profile"
  ON public.futureself_communication_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communication profile"
  ON public.futureself_communication_profile FOR UPDATE
  USING (auth.uid() = user_id);
