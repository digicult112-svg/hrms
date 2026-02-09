-- Auto-mark employees as absent if they don't have attendance logs on working days
-- This migration creates a function to identify missing attendance and create "Unexcused Absence" leave requests

-- Function to mark employees absent for missing attendance on working days
CREATE OR REPLACE FUNCTION public.mark_absent_for_missing_days(
    check_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    check_to_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    absent_date DATE,
    leave_created BOOLEAN
) AS $$
DECLARE
    current_check_date DATE;
    day_of_week INT;
BEGIN
    -- Loop through each date in the range
    current_check_date := check_from_date;
    
    WHILE current_check_date <= check_to_date LOOP
        -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
        day_of_week := EXTRACT(DOW FROM current_check_date);
        
        -- Only process working days (Monday=1 to Saturday=6, excluding Sunday=0)
        IF day_of_week >= 1 AND day_of_week <= 6 THEN
            -- Find employees who have no attendance log for this date
            -- and no existing leave request covering this date
            RETURN QUERY
            WITH absent_employees AS (
                SELECT 
                    p.id as emp_id,
                    p.full_name as emp_name,
                    current_check_date as abs_date
                FROM public.profiles p
                WHERE 
                    p.deleted_at IS NULL  -- Only active employees
                    AND p.is_frozen = FALSE  -- Only non-frozen accounts
                    AND p.role != 'admin'  -- Exclude admins from auto-absence
                    AND COALESCE(p.exempt_from_auto_absence, FALSE) = FALSE  -- Skip exempt employees
                    -- TIMEZONE-AWARE: No attendance log for this date
                    AND NOT EXISTS (
                        SELECT 1 FROM public.attendance_logs al
                        WHERE al.user_id = p.id 
                        AND (
                            -- Convert clock_in timestamp to employee's timezone before comparing dates
                            -- This ensures employees in different timezones are correctly tracked
                            (al.clock_in AT TIME ZONE 'UTC' AT TIME ZONE COALESCE(p.timezone, 'Asia/Kolkata'))::date = current_check_date
                            OR 
                            -- Fallback to work_date if clock_in is NULL
                            al.work_date = current_check_date
                        )
                    )
                    -- No existing leave request covering this date
                    AND NOT EXISTS (
                        SELECT 1 FROM public.leave_requests lr
                        WHERE lr.user_id = p.id
                        AND lr.start_date <= current_check_date
                        AND lr.end_date >= current_check_date
                    )
            ),
            created_leaves AS (
                INSERT INTO public.leave_requests (
                    user_id,
                    start_date,
                    end_date,
                    reason,
                    status,
                    created_at
                )
                SELECT 
                    emp_id,
                    abs_date,
                    abs_date,  -- Single day absence
                    'Unexcused Absence',
                    'approved',  -- Auto-approved so it shows on calendar
                    NOW()
                FROM absent_employees
                ON CONFLICT DO NOTHING  -- Prevent duplicates if function is called multiple times
                RETURNING user_id, start_date
            )
            SELECT 
                ae.emp_id,
                ae.emp_name,
                ae.abs_date,
                (cl.user_id IS NOT NULL) as leave_created
            FROM absent_employees ae
            LEFT JOIN created_leaves cl ON ae.emp_id = cl.user_id AND ae.abs_date = cl.start_date;
        END IF;
        
        current_check_date := current_check_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (HR can call this)
GRANT EXECUTE ON FUNCTION public.mark_absent_for_missing_days TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.mark_absent_for_missing_days IS 
'Automatically marks employees as absent by creating "Unexcused Absence" leave requests for working days (Mon-Sat) where they have no attendance log and no existing leave. Excludes Sundays and already-covered dates.';
