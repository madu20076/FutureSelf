-- Add talking avatar fields to futureself_profiles
ALTER TABLE public.futureself_profiles
  ADD COLUMN IF NOT EXISTS avatar_enabled  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_provider text    DEFAULT 'did',
  ADD COLUMN IF NOT EXISTS avatar_status   text    DEFAULT 'not_configured';

-- Valid provider values (extensible — add 'heygen' etc. when needed)
ALTER TABLE public.futureself_profiles
  DROP CONSTRAINT IF EXISTS futureself_profiles_avatar_provider_check;
ALTER TABLE public.futureself_profiles
  ADD CONSTRAINT futureself_profiles_avatar_provider_check
    CHECK (avatar_provider IN ('did'));

-- Valid status values
ALTER TABLE public.futureself_profiles
  DROP CONSTRAINT IF EXISTS futureself_profiles_avatar_status_check;
ALTER TABLE public.futureself_profiles
  ADD CONSTRAINT futureself_profiles_avatar_status_check
    CHECK (avatar_status IN ('not_configured', 'pending', 'ready', 'error'));
