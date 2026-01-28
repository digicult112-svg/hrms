-- CRITICAL FIX: Create missing 'salaries' table and ensure permissions.
-- Updated to include helper function definitions to avoid dependency errors.

-- 0. Ensure Helper Functions Exist (Dependency for Policies)
CREATE OR REPLACE FUNCTION public.is_hr()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'hr'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Create Table (if not exists)
CREATE TABLE IF NOT EXISTS public.salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC DEFAULT 0,
    tenant_id UUID REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_salary UNIQUE (user_id)
);

-- 2. Backfill Tenant ID if it was created without one (just in case)
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE subdomain = 'default' LIMIT 1;
    
    -- If created just now, it might be empty, but if it existed partially:
    UPDATE public.salaries SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    
    -- Ensure NOT NULL constraint eventually (optional but good practice)
    -- ALTER TABLE public.salaries ALTER COLUMN tenant_id SET NOT NULL; 
END $$;

-- 3. Enable RLS
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply Permissions (Robustly)
--    We drop existing policies to ensure clean slate.

DROP POLICY IF EXISTS "Admin and HR view all salaries" ON public.salaries;
DROP POLICY IF EXISTS "Admin and HR manage salaries" ON public.salaries;

-- View Policy
CREATE POLICY "Admin and HR view all salaries" ON public.salaries
FOR SELECT
USING (
    (
        (is_hr() OR is_admin())
        AND 
        tenant_id = get_auth_tenant_id()
    )
    OR
    (user_id = auth.uid()) -- Users see own salary
);

-- Manage Policy (Insert/Update)
CREATE POLICY "Admin and HR manage salaries" ON public.salaries
FOR ALL
USING (
    (is_hr() OR is_admin())
    AND 
    tenant_id = get_auth_tenant_id()
)
WITH CHECK (
    (is_hr() OR is_admin())
    AND 
    tenant_id = get_auth_tenant_id()
);

-- 5. Force Reload
NOTIFY pgrst, 'reload schema';
