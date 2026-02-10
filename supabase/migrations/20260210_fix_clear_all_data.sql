-- Fix the clear_all_employee_data() function to properly delete all data
-- This replaces the incomplete version that only reset profiles instead of deleting them

CREATE OR REPLACE FUNCTION clear_all_employee_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    current_user_id UUID;
BEGIN
    -- 🔒 SECURITY CHECK: Only Admins can wipe data
    current_user_id := auth.uid();
    
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = current_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can perform a System Wipe.';
    END IF;

    -- Delete in dependency order (child tables first)
    -- This ensures we don't violate foreign key constraints
    
    -- 1. Notifications and messages
    DELETE FROM public.notifications WHERE user_id <> current_user_id;
    DELETE FROM public.anonymous_messages;
    
    -- 2. Points system
    DELETE FROM public.points_transactions;
    DELETE FROM public.employee_points_wallets WHERE employee_id <> current_user_id;
    
    -- 3. Employee experience/history
    DELETE FROM public.employee_experience WHERE employee_id <> current_user_id;
    
    -- 4. Payroll and salaries
    DELETE FROM public.payroll WHERE employee_id <> current_user_id;
    DELETE FROM public.salaries WHERE employee_id <> current_user_id;
    
    -- 5. Attendance and leave
    DELETE FROM public.attendance_logs WHERE user_id <> current_user_id;
    DELETE FROM public.leave_requests WHERE user_id <> current_user_id;
    DELETE FROM public.leave_calendar_events;
    
    -- 6. Tickets and support
    DELETE FROM public.ticket_comments;
    DELETE FROM public.tickets WHERE created_by <> current_user_id;
    
    -- 7. Performance reviews
    DELETE FROM public.performance_reviews WHERE employee_id <> current_user_id;
    
    -- 8. Recruitment
    DELETE FROM public.candidates;
    DELETE FROM public.job_openings;
    DELETE FROM public.job_positions;
    
    -- 9. Audit logs (clear all for clean slate)
    DELETE FROM public.audit_logs;
    
    -- 10. FINALLY: Delete employee profiles (except current admin)
    SELECT COUNT(*) INTO deleted_count 
    FROM public.profiles 
    WHERE id <> current_user_id;
    
    DELETE FROM public.profiles WHERE id <> current_user_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'All employee data has been permanently deleted.',
        'deleted_employees', deleted_count,
        'preserved_admin', current_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise it
        RAISE EXCEPTION 'System Wipe Failed: %', SQLERRM;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION clear_all_employee_data() IS 
'Permanently deletes all employee data except the current admin user. Clears all tables including profiles, payroll, attendance, leaves, tickets, candidates, and audit logs. Requires admin role. Use with extreme caution - this is irreversible.';
