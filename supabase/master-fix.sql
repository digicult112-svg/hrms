-- =====================================================================
-- MASTER FIX: PROFILE VISIBILITY, RLS, AND DATA INTEGRITY
-- =====================================================================

-- 1. FIX RLS POLICIES (RECURSION-SAFE)
-- ---------------------------------------------------------------------

-- Create a SECURITY DEFINER function to check HR role safely.
-- This runs with the privileges of the function creator (postgres), bypassing RLS.
CREATE OR REPLACE FUNCTION public.is_hr()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'hr'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Authenticated reads profiles" ON public.profiles;
DROP POLICY IF EXISTS "HR reads all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employee reads own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated reads basic profile info" ON public.profiles;

-- Policy: ALLOW ALL AUTHENTICATED USERS TO VIEW ALL PROFILES
-- This is critical for the "Unknown" name issue.
CREATE POLICY "Authenticated reads profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Policy: HR CAN UPDATE ALL PROFILES
DROP POLICY IF EXISTS "HR updates all profiles" ON public.profiles;
CREATE POLICY "HR updates all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_hr())
WITH CHECK (is_hr());

-- Policy: HR CAN DELETE PROFILES
DROP POLICY IF EXISTS "HR deletes profiles" ON public.profiles;
CREATE POLICY "HR deletes profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (is_hr());

-- Policy: USERS CAN UPDATE THEIR OWN PROFILE
DROP POLICY IF EXISTS "Employee updates own profile" ON public.profiles;
CREATE POLICY "Employee updates own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: USERS CAN INSERT THEIR OWN PROFILE
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);


-- 2. FIX USER CREATION TRIGGER
-- ---------------------------------------------------------------------

-- Create a robust function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name text;
BEGIN
  -- Try to get full_name from metadata, otherwise use email prefix
  extracted_name := new.raw_user_meta_data->>'full_name';
  
  IF extracted_name IS NULL OR extracted_name = '' THEN
    extracted_name := INITCAP(SPLIT_PART(new.email, '@', 1));
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    new.id,
    new.email,
    extracted_name,
    'employee', -- Default role
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. BACKFILL MISSING DATA
-- ---------------------------------------------------------------------

-- Update existing profiles where name is missing
UPDATE public.profiles
SET full_name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL OR full_name = '' OR full_name = 'Unknown';

-- Ensure all auth users have a profile row
INSERT INTO public.profiles (id, email, full_name, role, created_at)
SELECT 
  id, 
  email, 
  INITCAP(SPLIT_PART(email, '@', 1)), 
  'employee', 
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
