-- =====================================================================
-- DANGER: FACTORY RESET SCRIPT
-- =====================================================================
-- This script will wipe ALL transactional data from the system.
-- It works by truncating tables to remove all rows.
-- Users (Logins) are NOT deleted, but their data (salary, attendance, etc.) is wiped.

BEGIN;

-- 1. Wipe HR Modules (Transactional Data)
TRUNCATE TABLE 
    payroll, 
    attendance_logs, 
    leaves, 
    audit_logs, 
    tickets, 
    ticket_comments,
    job_applications,
    job_postings
    RESTART IDENTITY CASCADE;

-- 2. Reset Profile Data (Keep accounts, but reset info)
-- Sets Salary to 0. 
-- You can add other fields here if you want to reset Designation etc.
UPDATE profiles 
SET 
    salary = 0,
    -- designation = 'Employee', -- Uncomment if you want to reset designation
    joining_date = CURRENT_DATE;

COMMIT;

-- Note: To delete the actual User Accounts, you must do that 
-- from the Supabase Dashboard > Authentication > Users panel.
