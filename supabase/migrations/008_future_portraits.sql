-- Storage bucket for portrait images
INSERT INTO storage.buckets (id, name, public)
VALUES ('future-portraits', 'future-portraits', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own portraits"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'future-portraits'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view portraits"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'future-portraits');

CREATE POLICY "Users can delete own portraits"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'future-portraits'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Portraits table
CREATE TABLE IF NOT EXISTS public.future_portraits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  futureself_profile_id uuid REFERENCES public.futureself_profiles(id) ON DELETE CASCADE,
  portrait_type text NOT NULL CHECK (
    portrait_type IN ('five_years', 'ten_years', 'entrepreneur', 'family', 'retirement', 'best_self')
  ),
  image_url text NOT NULL,
  prompt_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.future_portraits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own portraits"
  ON public.future_portraits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portraits"
  ON public.future_portraits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portraits"
  ON public.future_portraits FOR DELETE
  USING (auth.uid() = user_id);
