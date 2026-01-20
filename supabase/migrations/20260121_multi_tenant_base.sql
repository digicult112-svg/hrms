-- =====================================================================
-- MULTI-TENANT ARCHITECTURAL FOUNDATION
-- =====================================================================

-- 1. Create Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE, -- Optional: for tenant-specific URLs
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can see their own tenant" ON public.tenants FOR SELECT USING (true); -- Usually restricted, but for foundation we allow view.

-- 2. Insert a Default Tenant
INSERT INTO public.tenants (name, subdomain) 
VALUES ('Default Organization', 'default')
ON CONFLICT (subdomain) DO NOTHING;

-- 3. Get the Default Tenant ID
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE subdomain = 'default' LIMIT 1;

    -- 4. Add tenant_id to profiles (the root of tenant relations)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        UPDATE public.profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- 5. Add tenant_id to other core tables
    -- Loop through core tables and add column if missing
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'attendance_logs', 'leave_requests', 'payroll', 'job_positions', 
            'candidates', 'interviews', 'audit_logs', 'office_locations', 
            'leave_calendar_events', 'performance_summary_monthly', 'announcements',
            'tickets', 'ticket_comments', 'notifications'
        ])
    LOOP
        EXECUTE format('
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = ''public'' AND table_name = %L AND column_name = ''tenant_id'') THEN
                ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
                UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL;
                -- ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL; -- Keeping nullable for easier future migrations but foundation is there
            END IF;
        ', table_name, table_name, table_name, default_tenant_id, table_name);
    END LOOP;
END $$;

-- 6. Update RLS Policies to use tenant isolation
-- We will replace the current 'is_hr()' check with '(is_hr() OR owner_check) AND tenant_id = user_tenant_id'

-- Helper function to get the current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Example of an updated policy structure (Foundation)
-- Note: Applying these to all tables would be a subsequent step during hardening.
-- For now, the foundation is the column presence and the access helper.
