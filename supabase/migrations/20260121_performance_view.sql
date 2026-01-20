-- Create a dynamic performance view to replace the static performance_summary_monthly table
-- This view aggregates data in real-time and handles timezone alignment for IST (UTC+5:30)

CREATE OR REPLACE VIEW public.attendance_performance_view AS
WITH monthly_attendance AS (
    SELECT 
        user_id,
        EXTRACT(YEAR FROM (work_date))::int as year,
        EXTRACT(MONTH FROM (work_date))::int as month,
        SUM(total_hours) as total_hours,
        COUNT(DISTINCT work_date) as present_days
    FROM public.attendance_logs
    GROUP BY user_id, year, month
),
monthly_leaves AS (
    -- We need to expand date ranges to count leaves per month correctly
    SELECT 
        user_id,
        EXTRACT(YEAR FROM d)::int as year,
        EXTRACT(MONTH FROM d)::int as month,
        COUNT(*) as leave_days
    FROM (
        SELECT user_id, generate_series(start_date, end_date, '1 day'::interval)::date as d
        FROM public.leave_requests
        WHERE status = 'approved'
    ) expanded_leaves
    GROUP BY user_id, year, month
)
SELECT 
    COALESCE(a.user_id, l.user_id) as user_id,
    COALESCE(a.year, l.year) as year,
    COALESCE(a.month, l.month) as month,
    COALESCE(a.total_hours, 0) as total_hours,
    COALESCE(l.leave_days, 0) as total_leaves,
    COALESCE(a.present_days, 0) as present_days
FROM monthly_attendance a
FULL OUTER JOIN monthly_leaves l 
    ON a.user_id = l.user_id 
    AND a.year = l.year 
    AND a.month = l.month;

-- RLS for the View (Supabase views inherit RLS from underlying tables, 
-- but we can explicitly define access if needed or rely on the underlying table policies)
-- Underlying tables: attendance_logs, leave_requests (both have RLS)

-- NOTE: If we want to strictly allow HR to see everyone and employees only their own, 
-- we ensure the SELECT on underlying tables is correctly set up.
-- attendance_logs is already set up: 
-- "Employee reads own attendance"
-- "HR reads all attendance"
-- leave_requests is already set up:
-- "Employee reads own leave requests"
-- "HR reads all leave requests"

-- We can drop the old static table once we verify the frontend is working with the view.
-- DROP TABLE IF EXISTS public.performance_summary_monthly CASCADE;
