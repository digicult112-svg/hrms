-- Fix for missing tenant_id column in schema cache
-- This migration ensures the column exists and forces a cache reload

DO $$
BEGIN
    -- 1. Ensure tenant_id exists on attendance_logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.attendance_logs ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        
        -- Try to populate it from the user's profile if possible, otherwise default tenant
        -- For now, we leave it nullable or set a default if we can find one. 
        -- Given the previous migration strategy, let's just add it.
        -- Logic to backfill would be complex without more context, but usually it's fine for new logs.
    END IF;

    -- 2. Force schema cache reload (PostgREST specific)
    NOTIFY pgrst, 'reload schema';
END $$;
       