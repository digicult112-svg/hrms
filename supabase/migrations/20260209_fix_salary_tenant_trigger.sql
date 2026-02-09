-- Fix for RLS violation when upserting salaries without tenant_id
-- We create a trigger to automatically set the tenant_id from the user's profile
-- This ensures the NEW row satisfies the RLS policy "tenant_id = get_auth_tenant_id()"

CREATE OR REPLACE FUNCTION public.set_salary_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if not already provided or if NULL
    IF NEW.tenant_id IS NULL THEN
        -- We get the tenant_id from the user's profile
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.profiles
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication
DROP TRIGGER IF EXISTS set_salary_tenant_id_trigger ON public.salaries;

CREATE TRIGGER set_salary_tenant_id_trigger
    BEFORE INSERT OR UPDATE ON public.salaries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_salary_tenant_id();
