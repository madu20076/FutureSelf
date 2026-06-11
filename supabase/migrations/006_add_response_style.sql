-- ── Phase 6.1: Response Style ────────────────────────────────────────────────

ALTER TABLE public.futureself_profiles
  ADD COLUMN IF NOT EXISTS response_style text NOT NULL DEFAULT 'Balanced'
  CONSTRAINT futureself_profiles_response_style_check
    CHECK (response_style IN ('Brief', 'Balanced', 'Detailed'));
