-- Quick fix: Add INSERT policy for candidates
-- Run this after adding tenant_id column

-- Allow HR to insert candidates
DROP POLICY IF EXISTS "HR can insert candidates" ON public.candidates;
CREATE POLICY "HR can insert candidates" ON public.candidates
FOR INSERT
WITH CHECK (true);  -- Temporarily allow all inserts, we'll tighten this later

-- Force schema reload
NOTIFY pgrst, 'reload schema';
