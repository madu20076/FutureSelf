-- Migrate legacy voice style values to gender-aware names.
-- calm → female-calm (nova), warm → female-warm (shimmer),
-- direct → male-calm (onyx), deep → male-deep (echo), reflective → neutral (alloy).

update public.futureself_profiles set voice_style = 'female-calm' where voice_style = 'calm';
update public.futureself_profiles set voice_style = 'female-warm' where voice_style = 'warm';
update public.futureself_profiles set voice_style = 'male-calm'   where voice_style = 'direct';
update public.futureself_profiles set voice_style = 'male-deep'   where voice_style = 'deep';
update public.futureself_profiles set voice_style = 'neutral'     where voice_style = 'reflective';

alter table public.futureself_profiles
  alter column voice_style set default 'female-calm';
