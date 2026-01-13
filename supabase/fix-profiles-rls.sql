-- =====================================================================
-- FIX RLS RECURSION ERROR & RESTORE VISIBILITY
-- =====================================================================

-- 1. Create a SECURITY DEFINER function to check HR role.
-- This bypasses RLS, preventing infinite recursion when querying profiles.
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

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow ALL authenticated users to view ALL profiles.
-- This fixes the "Unknown" name issue immediately.
DROP POLICY IF EXISTS "Authenticated reads profiles" ON public.profiles;
CREATE POLICY "Authenticated reads profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Allow HR to update ALL profiles (using the safe function)
DROP POLICY IF EXISTS "HR updates all profiles" ON public.profiles;
CREATE POLICY "HR updates all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_hr())
WITH CHECK (is_hr());

-- 4. Allow HR to delete profiles
DROP POLICY IF EXISTS "HR deletes profiles" ON public.profiles;
CREATE POLICY "HR deletes profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (is_hr());

-- 5. Allow users to update their OWN profile
DROP POLICY IF EXISTS "Employee updates own profile" ON public.profiles;
CREATE POLICY "Employee updates own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Allow users to insert their own profile (needed for new signups if not handled by trigger)
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
