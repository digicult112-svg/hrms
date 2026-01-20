-- Hardening Attendance Logs to rely on Server Time
-- Part of Phase 6: Data Integrity

-- 1. Ensure attendance_logs has robust server-side defaults
ALTER TABLE public.attendance_logs 
ALTER COLUMN work_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN clock_in SET DEFAULT NOW();

-- 2. Add an RPC to get the server's local ISO date (considering IST UTC+5:30)
-- This ensures the frontend and backend agree on what "Today" is.
CREATE OR REPLACE FUNCTION public.get_server_today()
RETURNS DATE AS $$
    SELECT (NOW() AT TIME ZONE 'UTC' + INTERVAL '5 hours 30 minutes')::DATE;
$$ LANGUAGE sql STABLE;

-- 3. Update notifyHR to be tenant-aware internally (if not already)
-- This is a proactive security measure.
CREATE OR REPLACE FUNCTION public.notify_hr_tenant_aware(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info'
)
RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
    
    INSERT INTO public.notifications (user_id, title, message, type, tenant_id)
    SELECT id, p_title, p_message, p_type, v_tenant_id
    FROM public.profiles
    WHERE role = 'hr' AND tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
