-- Kampus Filter Admin Security Setup
-- Run this script in Supabase SQL editor before using admin routes.

-- 1) Ensure required extension exists for UUID generation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create admin_users table if missing.
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Create enquiries table if missing.
CREATE TABLE IF NOT EXISTS public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  mobile text,
  course_interest text,
  city_interest text,
  budget text,
  exam_type text,
  class12_stream text,
  class12_percentage numeric(5,2),
  message text,
  status text NOT NULL DEFAULT 'new',
  source_page_slug text,
  source_page_title text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  admin_notes text,
  contact_channel text,
  notes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Add missing columns on existing tables (safe if already present).
ALTER TABLE IF EXISTS public.admin_users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS public.admin_users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE IF EXISTS public.admin_users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE IF EXISTS public.admin_users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.admin_users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS course_interest text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS city_interest text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS budget text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS exam_type text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS class12_stream text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS class12_percentage numeric(5,2);
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS source_page_slug text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS source_page_title text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS contact_channel text;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS notes_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS activity_log jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.enquiries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 5) Performance indexes.
CREATE INDEX IF NOT EXISTS idx_admin_users_email_lower ON public.admin_users (lower(email));
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_course_interest ON public.enquiries (course_interest);
CREATE INDEX IF NOT EXISTS idx_enquiries_city_interest ON public.enquiries (city_interest);
CREATE INDEX IF NOT EXISTS idx_enquiries_exam_type ON public.enquiries (exam_type);

-- 6) Enable RLS.
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 7) Policies for enquiries.
DROP POLICY IF EXISTS "Admin can read enquiries" ON public.enquiries;
CREATE POLICY "Admin can read enquiries"
ON public.enquiries FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.admin_users));

DROP POLICY IF EXISTS "Admin can update enquiries" ON public.enquiries;
CREATE POLICY "Admin can update enquiries"
ON public.enquiries FOR UPDATE
USING (auth.uid() IN (SELECT id FROM public.admin_users));

DROP POLICY IF EXISTS "Admin can delete enquiries" ON public.enquiries;
CREATE POLICY "Admin can delete enquiries"
ON public.enquiries FOR DELETE
USING (auth.uid() IN (SELECT id FROM public.admin_users));

DROP POLICY IF EXISTS "Public can insert enquiries" ON public.enquiries;
CREATE POLICY "Public can insert enquiries"
ON public.enquiries FOR INSERT
WITH CHECK (true);

-- 8) Policies for admin_users.
DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
CREATE POLICY "Admins can read admin_users"
ON public.admin_users FOR SELECT
USING (auth.uid() = id);

-- 9) Keep updated_at fresh on updates.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.enquiries;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.enquiries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
