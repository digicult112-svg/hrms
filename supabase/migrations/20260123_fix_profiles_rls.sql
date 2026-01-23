-- Fix: Allow HR to update profiles (specifically for Freeze/Unfreeze functionality)

-- 1. Drop existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "HR updates profiles" ON public.profiles;

-- 2. Create the new policy allowing HR to update profiles within their tenant
CREATE POLICY "HR updates profiles" ON public.profiles
FOR UPDATE
USING (
    is_hr() -- Check if user has HR role (via JWT or helper)
    AND 
    tenant_id = get_auth_tenant_id() -- Ensure tenant isolation
)
WITH CHECK (
    is_hr() 
    AND 
    tenant_id = get_auth_tenant_id()
);

-- 3. Force schema cache reload to ensure immediate effect
NOTIFY pgrst, 'reload schema';
