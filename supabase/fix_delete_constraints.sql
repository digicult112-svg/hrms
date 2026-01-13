-- =====================================================================
-- FIX: Allow Employee Deletion (Cascade Constraints)
-- =====================================================================

-- 1. Attendance Logs
ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_user_id_fkey;
ALTER TABLE attendance_logs
    ADD CONSTRAINT attendance_logs_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- 2. Leave Requests
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;
ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- 3. Payroll
ALTER TABLE payroll DROP CONSTRAINT IF EXISTS payroll_user_id_fkey;
ALTER TABLE payroll
    ADD CONSTRAINT payroll_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- 4. Performance Summary
ALTER TABLE performance_summary_monthly DROP CONSTRAINT IF EXISTS performance_summary_monthly_user_id_fkey;
ALTER TABLE performance_summary_monthly
    ADD CONSTRAINT performance_summary_monthly_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- 5. Audit Logs
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- 6. Leave Calendar Events (Set NULL instead of delete)
ALTER TABLE leave_calendar_events DROP CONSTRAINT IF EXISTS leave_calendar_events_created_by_fkey;
ALTER TABLE leave_calendar_events
    ADD CONSTRAINT leave_calendar_events_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES profiles(id)
    ON DELETE SET NULL;
