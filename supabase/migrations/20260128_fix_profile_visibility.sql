-- Allow Admins and HRs to view ALL profiles within their tenant.
-- This is required for Payroll, Employee List, etc. to function correctly.

-- 1. Drop existing SELECT policy if exists (to avoid conflicts)
DROP POLICY IF EXISTS "Admin and HR view all profiles" ON public.profiles;

-- 2. Create the new policy
CREATE POLICY "Admin and HR view all profiles" ON public.profiles
FOR SELECT
USING (
    (auth.uid() = id) -- User can see themselves
    OR
    (
        (is_hr() OR is_admin()) -- Check if user has HR or Admin role
        AND 
        tenant_id = get_auth_tenant_id() -- Ensure tenant isolation
    )
);

-- 3. Ensure is_admin() helper exists (is_hr likely exists but let's be safe)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Force schema cache reload
NOTIFY pgrst, 'reload schema';
