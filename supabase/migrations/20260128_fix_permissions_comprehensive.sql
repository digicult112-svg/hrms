-- COMPREHENSIVE PERMISSIONS FIX
-- 1. Redefine is_hr() and is_admin() as SECURITY DEFINER to prevent RLS recursion.
-- 2. Ensure RLS policies exist for Profiles and Salaries.

-- A. Helper Functions (Security Critical)
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

-- B. Profiles RLS (Re-apply to use new safe functions)
DROP POLICY IF EXISTS "Admin and HR view all profiles" ON public.profiles;

CREATE POLICY "Admin and HR view all profiles" ON public.profiles
FOR SELECT
USING (
    (auth.uid() = id) 
    OR
    (
        (is_hr() OR is_admin()) 
        AND 
        tenant_id = get_auth_tenant_id()
    )
);

-- C. Salaries RLS (Missing Piece?)
-- Enable RLS if not already
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

-- Allow Admin/HR to View All Salaries in Tenant
DROP POLICY IF EXISTS "Admin and HR view all salaries" ON public.salaries;

CREATE POLICY "Admin and HR view all salaries" ON public.salaries
FOR SELECT
USING (
    (
        (is_hr() OR is_admin())
        AND 
        tenant_id = get_auth_tenant_id()
    )
    OR
    (user_id = auth.uid()) -- Users can see their own salary
);

-- Allow Admin/HR to Insert/Update Salaries
DROP POLICY IF EXISTS "Admin and HR manage salaries" ON public.salaries;

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

-- D. Force Reload
NOTIFY pgrst, 'reload schema';
