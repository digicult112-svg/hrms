-- Enable extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Attendance Concurrency Control
-- Ensure only one attendance log per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date 
ON public.attendance_logs(user_id, work_date);

-- 2. Leave Concurrency Control
-- Prevent overlapping leave requests for the same user
-- We use start_date and end_date to form a range
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS exclude_overlapping_leaves;

ALTER TABLE public.leave_requests
ADD CONSTRAINT exclude_overlapping_leaves
EXCLUDE USING gist (
  user_id WITH =,
  daterange(start_date, end_date, '[]') WITH &&
)
WHERE (status <> 'rejected'); -- Only check for pending or approved leaves

-- 3. Prevent attendance logging on leave
-- Note: This might be too restrictive if someone works on leave, 
-- but generally we should at least have a warning. 
-- For now, let's just stick to the overlapping checks.
