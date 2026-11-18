-- First local admin. Schema only. No production people.
--
-- 1. Create the user in Supabase Auth (Dashboard → Authentication → Users).
-- 2. Replace the email below. The script stops if the placeholder is still here
--    or if that email is not exactly one auth.users row.
-- 3. Run this whole file in the Supabase SQL editor for the development database.
--
-- Admin access is a row in public.internal_users (role ADMIN).
-- Staff access is public.user_profiles.is_staff. The portal "me" route also reads
-- user_profiles.is_admin. This script sets both.

DO $$
DECLARE
  target_email text := 'replace-with-admin@example.com';
  target_id uuid;
  match_count integer;
BEGIN
  IF target_email = 'replace-with-admin@example.com' OR target_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Edit target_email before running this script.';
  END IF;

  SELECT count(*) INTO match_count FROM auth.users WHERE lower(email) = lower(target_email);
  IF match_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one auth.users row for %, found %.', target_email, match_count;
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(target_email);

  INSERT INTO public.internal_users (user_id, role)
  VALUES (target_id, 'ADMIN')
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.user_profiles (user_id, email, is_staff, is_admin)
  VALUES (target_id, target_email, true, true)
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        is_staff = true,
        is_admin = true;
END $$;
