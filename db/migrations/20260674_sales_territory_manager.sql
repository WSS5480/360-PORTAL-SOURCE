-- Territory manager role for sales team hierarchy (setup + future rep roster visibility).
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_territory_manager boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.is_territory_manager IS
  'Internal sales territory manager. Future: manages a roster of sales reps and their activity visibility.';
