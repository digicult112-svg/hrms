-- Fix for Candidates RLS Policy Violation
-- Creates an RPC function to handle candidate insertion with proper tenant_id

-- 0. Ensure tenant_id column exists on candidates table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.candidates ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;
END $$;

-- 1. Create RPC function for adding candidates
CREATE OR REPLACE FUNCTION public.add_candidate(
    p_full_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_job_id UUID
)
RETURNS JSONB AS $$
DECLARE
    caller_role TEXT;
    caller_tenant_id UUID;
    new_candidate JSONB;
BEGIN
    -- Get caller's role and tenant_id
    SELECT role, tenant_id INTO caller_role, caller_tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    IF caller_role NOT IN ('hr', 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Only HR can add candidates';
    END IF;

    IF caller_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID not found for user';
    END IF;

    -- Insert the candidate with the caller's tenant_id
    INSERT INTO public.candidates (
        full_name,
        email,
        phone,
        job_id,
        tenant_id,
        status
    )
    VALUES (
        p_full_name,
        p_email,
        p_phone,
        p_job_id,
        caller_tenant_id,
        'applied'
    )
    RETURNING jsonb_build_object(
        'id', id,
        'full_name', full_name,
        'email', email,
        'phone', phone,
        'job_id', job_id,
        'status', status,
        'created_at', created_at
    ) INTO new_candidate;

    RETURN new_candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Also add INSERT policy for candidates (in case it's missing)
DROP POLICY IF EXISTS "HR can insert candidates" ON public.candidates;
CREATE POLICY "HR can insert candidates" ON public.candidates
FOR INSERT
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('hr', 'admin')
    AND
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. Also add UPDATE policy for drag-and-drop status changes
DROP POLICY IF EXISTS "HR can update candidates" ON public.candidates;
CREATE POLICY "HR can update candidates" ON public.candidates
FOR UPDATE
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('hr', 'admin')
    AND
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('hr', 'admin')
    AND
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. Also add DELETE policy  
DROP POLICY IF EXISTS "HR can delete candidates" ON public.candidates;
CREATE POLICY "HR can delete candidates" ON public.candidates
FOR DELETE
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('hr', 'admin')
    AND
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
