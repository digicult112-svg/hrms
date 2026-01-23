-- Fix: Robust Tenant ID Helper and Re-apply Profiles Policy
-- This ensures that even if the JWT is stale (missing tenant_id), we can still authorize the user correctly.

-- 1. Update the helper function to fallback to the profiles table
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
DECLARE
    jwt_tenant_id UUID;
BEGIN
    -- Try to get from JWT first (fastest)
    SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID INTO jwt_tenant_id;
    
    IF jwt_tenant_id IS NOT NULL THEN
        RETURN jwt_tenant_id;
    END IF;

    -- Fallback: Query the database directly (slower but reliable for stale sessions)
    -- This is critical for the "Freeze" button to work immediately after a migration
    RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Re-apply the Profile Update Policy (Just in case)
DROP POLICY IF EXISTS "HR updates profiles" ON public.profiles;

CREATE POLICY "HR updates profiles" ON public.profiles
FOR UPDATE
USING (
    is_hr() 
    AND 
    tenant_id = get_auth_tenant_id()
)
WITH CHECK (
    is_hr() 
    AND 
    tenant_id = get_auth_tenant_id()
);

-- 3. Force schema cache reload
NOTIFY pgrst, 'reload schema';
