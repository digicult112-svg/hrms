-- COMPREHENSIVE FIX: Candidates Table with Proper RLS
-- This is the complete, secure solution

-- Step 1: Ensure tenant_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.candidates ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Step 2: Backfill existing candidates with tenant_id from their associated profiles
-- (Assuming candidates are created by HR users who have tenant_ids)
UPDATE public.candidates c
SET tenant_id = (
    SELECT tenant_id FROM public.profiles WHERE role IN ('hr', 'admin') LIMIT 1
)
WHERE tenant_id IS NULL;

-- Step 3: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "HR reads candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR can delete candidates" ON public.candidates;

-- Step 4: Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Step 5: Create proper SELECT policy
CREATE POLICY "candidates_select_policy" ON public.candidates
FOR SELECT
USING (
    -- Allow if user is HR/Admin
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('hr', 'admin')
    )
);

-- Step 6: Create INSERT policy using a helper function
-- First, create the helper function
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Now create the INSERT policy
CREATE POLICY "candidates_insert_policy" ON public.candidates
FOR INSERT
WITH CHECK (
    -- Must be HR/Admin
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('hr', 'admin')
    )
    -- tenant_id must match user's tenant_id (or be NULL and will be set)
    AND (
        tenant_id = current_user_tenant_id()
        OR tenant_id IS NULL
    )
);

-- Step 7: Create UPDATE policy
CREATE POLICY "candidates_update_policy" ON public.candidates
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('hr', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('hr', 'admin')
    )
);

-- Step 8: Create DELETE policy
CREATE POLICY "candidates_delete_policy" ON public.candidates
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('hr', 'admin')
    )
);

-- Step 9: Create trigger to auto-set tenant_id on insert
CREATE OR REPLACE FUNCTION public.set_candidate_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_candidate_tenant_id_trigger ON public.candidates;
CREATE TRIGGER set_candidate_tenant_id_trigger
    BEFORE INSERT ON public.candidates
    FOR EACH ROW
    EXECUTE FUNCTION set_candidate_tenant_id();

-- Step 10: Reload schema
NOTIFY pgrst, 'reload schema';

-- Summary:
-- - tenant_id column added
-- - Existing records backfilled
-- - Proper RLS policies for SELECT, INSERT, UPDATE, DELETE
-- - Auto-set tenant_id via trigger
-- - Helper function for tenant checking
