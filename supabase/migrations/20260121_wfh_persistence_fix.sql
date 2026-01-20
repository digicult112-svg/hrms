-- Phase 9: WFH Persistence & Date Alignment Fix
-- This migration ensures that attendance logs are always correctly tagged with tenant_id and the IST work_date.

-- 1. Create a trigger function to auto-populate tenant_id and fix work_date
CREATE OR REPLACE FUNCTION public.sync_attendance_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate tenant_id from the user's profile if it's missing
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (SELECT tenant_id FROM public.profiles WHERE id = NEW.user_id);
    END IF;

    -- Ensure work_date always aligns with IST (GMT+5:30)
    -- This prevents the "invisible logs" bug during the midnight UTC-IST window.
    IF NEW.work_date IS DISTINCT FROM (NEW.clock_in AT TIME ZONE 'UTC' + INTERVAL '5 hours 30 minutes')::DATE THEN
        NEW.work_date := (NEW.clock_in AT TIME ZONE 'UTC' + INTERVAL '5 hours 30 minutes')::DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply the trigger
DROP TRIGGER IF EXISTS tr_sync_attendance_metadata ON public.attendance_logs;
CREATE TRIGGER tr_sync_attendance_metadata
    BEFORE INSERT ON public.attendance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_attendance_metadata();

-- 3. Backfill any existing NULL tenant_ids in attendance_logs
UPDATE public.attendance_logs al
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE al.user_id = p.id
AND al.tenant_id IS NULL;

-- 4. Set fallback default for work_date to use get_server_today()
ALTER TABLE public.attendance_logs 
ALTER COLUMN work_date SET DEFAULT get_server_today();
