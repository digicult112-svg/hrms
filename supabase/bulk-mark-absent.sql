-- Function to bulk mark absent for a specific date
CREATE OR REPLACE FUNCTION bulk_mark_absent(target_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count integer;
    inserted_users uuid[];
BEGIN
    -- Insert Unexcused Absence leave requests for users who:
    -- 1. Are active employees
    -- 2. Have NO attendance log for target_date
    -- 3. Have NO overlapping approved leave request
    
    WITH missing_employees AS (
        SELECT p.id as user_id
        FROM profiles p
        WHERE p.role = 'employee'
        AND NOT EXISTS (
            SELECT 1 FROM attendance_logs a 
            WHERE a.user_id = p.id 
            AND a.work_date = target_date
        )
        AND NOT EXISTS (
            SELECT 1 FROM leave_requests l
            WHERE l.user_id = p.id
            AND l.status = 'approved'
            AND target_date BETWEEN l.start_date AND l.end_date
        )
    ),
    inserted_leaves AS (
        INSERT INTO leave_requests (user_id, start_date, end_date, reason, status, hr_comment)
        SELECT 
            user_id, 
            target_date, 
            target_date, 
            'Unexcused Absence', 
            'approved', 
            'Auto-marked via Bulk Action'
        FROM missing_employees
        RETURNING user_id
    ),
    -- Insert Notifications for these users
    inserted_notifications AS (
        INSERT INTO pending_notifications (user_id, title, message, type)
        SELECT 
            user_id,
            'Marked Absent',
            'You have been marked absent for ' || target_date || ' as no attendance record was found. Please contact HR if this is a mistake.',
            'warning'
        FROM inserted_leaves
        RETURNING user_id
    )
    SELECT count(*), array_agg(user_id) INTO affected_count, inserted_users FROM inserted_leaves;

    RETURN json_build_object(
        'success', true,
        'affected_rows', affected_count,
        'users', inserted_users
    );
END;
$$;
