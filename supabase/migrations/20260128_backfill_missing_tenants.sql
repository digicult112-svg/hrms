-- ROBUST Backfill and Schema Repair
-- This script safely checks for the existence of tables and columns before operating.
-- It will ADD the 'tenant_id' column if it's missing (Schema Repair) and then backfill data.

DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    -- 1. Get (or create) Default Tenant
    SELECT id INTO default_tenant_id FROM public.tenants WHERE subdomain = 'default' LIMIT 1;
    
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.tenants (name, subdomain) 
        VALUES ('Default Organization', 'default')
        RETURNING id INTO default_tenant_id;
    END IF;

    -- =================================================================
    -- Helper Logic for each table
    -- =================================================================

    -- 2. Profiles (Critical)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Check column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
        -- Backfill
        UPDATE public.profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- 3. Salaries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salaries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.salaries ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
        
        -- Sync from profile if possible
        UPDATE public.salaries s
        SET tenant_id = p.tenant_id
        FROM public.profiles p
        WHERE s.user_id = p.id AND s.tenant_id IS NULL;
        
        -- Fallback
        UPDATE public.salaries SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- 4. Attendance Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.attendance_logs ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
        UPDATE public.attendance_logs SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- 5. Leave Requests (The one that failed previously)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.leave_requests ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
        UPDATE public.leave_requests SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- 6. Payroll
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'tenant_id') THEN
             ALTER TABLE public.payroll ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
        UPDATE public.payroll SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    END IF;

END $$;
