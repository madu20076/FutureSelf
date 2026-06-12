-- Add subscription fields to futureself_profiles
ALTER TABLE public.futureself_profiles
  ADD COLUMN IF NOT EXISTS plan                  text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status   text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_customer_id    text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Ensure existing rows have non-null defaults
UPDATE public.futureself_profiles
  SET plan = 'free', subscription_status = 'inactive'
  WHERE plan IS NULL OR subscription_status IS NULL;

-- Valid plan values
ALTER TABLE public.futureself_profiles
  DROP CONSTRAINT IF EXISTS futureself_profiles_plan_check;
ALTER TABLE public.futureself_profiles
  ADD CONSTRAINT futureself_profiles_plan_check
    CHECK (plan IN ('free', 'premium'));

-- Valid subscription status values
ALTER TABLE public.futureself_profiles
  DROP CONSTRAINT IF EXISTS futureself_profiles_subscription_status_check;
ALTER TABLE public.futureself_profiles
  ADD CONSTRAINT futureself_profiles_subscription_status_check
    CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing'));
