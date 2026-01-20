-- Atomic System Wipe Function
CREATE OR REPLACE FUNCTION clear_all_employee_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 🔒 SECURITY CHECK: Only Admins can wipe data
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can perform a Factory Reset.';
    END IF;

    -- Delete in dependency order
    DELETE FROM public.audit_logs;
    DELETE FROM public.payroll;
    DELETE FROM public.attendance_logs;
    DELETE FROM public.leave_requests;
    DELETE FROM public.leave_calendar_events;
    DELETE FROM public.tickets;
    DELETE FROM public.performance_reviews;
    DELETE FROM public.candidates;
    DELETE FROM public.job_openings;
    
    -- Reset profiles (but keep them so they can still log in if needed, or we can soft-delete them)
    -- The user requested to "Clear All Employee Data", which usually means the records associated with them.
    -- If we want a true factory reset, we might want to clear profiles too (except the current user).
    
    UPDATE public.profiles 
    SET salary = 0, 
        base_location_id = NULL,
        designation = NULL,
        daily_work_hours = 8
    WHERE id <> auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'All system data has been cleared successfully.');
END;
$$;
