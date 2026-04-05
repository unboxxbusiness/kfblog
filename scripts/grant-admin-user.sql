-- Grant admin access to an existing authenticated user.
-- Replace the email below, then run this script in Supabase SQL editor.

DO $$
DECLARE
  target_email text := lower('unboxxbusiness@gmail.com');
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = target_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users record found for email: %', target_email;
  END IF;

  -- Normalize any stale rows for this email/id pair.
  UPDATE public.admin_users
  SET
    id = target_user_id,
    email = target_email,
    role = 'admin',
    updated_at = now()
  WHERE lower(email) = target_email
     OR id = target_user_id;

  -- If no row exists yet, create it.
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE id = target_user_id
       OR lower(email) = target_email
  ) THEN
    INSERT INTO public.admin_users (id, email, name, role, created_at, updated_at)
    VALUES (
      target_user_id,
      target_email,
      split_part(target_email, '@', 1),
      'admin',
      now(),
      now()
    );
  END IF;

  RAISE NOTICE 'Admin mapping active: email=%, id=%', target_email, target_user_id;
END $$;
