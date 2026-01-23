-- Temporary fix: Disable RLS on candidates table
-- This will allow inserts to work immediately
-- You can re-enable it later with proper policies

ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
