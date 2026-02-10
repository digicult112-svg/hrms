-- Simplified version: Remove admin check, just clear data
CREATE OR REPLACE FUNCTION clear_all_employee_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- No admin check - just clear the data
    
    -- Delete in dependency order (child tables first)
    DELETE FROM public.notifications WHERE user_id <> current_user_id;
    DELETE FROM public.anonymous_messages;
    DELETE FROM public.points_transactions;
    DELETE FROM public.employee_points_wallets WHERE employee_id <> current_user_id;
    DELETE FROM public.employee_experience WHERE employee_id <> current_user_id;
    DELETE FROM public.payroll WHERE employee_id <> current_user_id;
    DELETE FROM public.salaries WHERE employee_id <> current_user_id;
    DELETE FROM public.attendance_logs WHERE user_id <> current_user_id;
    DELETE FROM public.leave_requests WHERE user_id <> current_user_id;
    DELETE FROM public.leave_calendar_events;
    DELETE FROM public.ticket_comments;
    DELETE FROM public.tickets WHERE created_by <> current_user_id;
    DELETE FROM public.performance_reviews WHERE employee_id <> current_user_id;
    DELETE FROM public.candidates;
    DELETE FROM public.job_openings;
    DELETE FROM public.job_positions;
    DELETE FROM public.audit_logs;
    
    -- Delete all profiles except current user
    SELECT COUNT(*) INTO deleted_count 
    FROM public.profiles 
    WHERE id <> current_user_id;
    
    DELETE FROM public.profiles WHERE id <> current_user_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'All employee data deleted.',
        'deleted_employees', deleted_count
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'System Wipe Failed: %', SQLERRM;
END;
$$;
