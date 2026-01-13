-- =====================================================================
-- DANGER: FACTORY RESET SCRIPT (Authorized)
-- =====================================================================

BEGIN;

-- 1. Wipe HR Modules (Transactional Data)
-- Using correct table names from schema
TRUNCATE TABLE 
    payroll, 
    attendance_logs, 
    leave_requests, -- Corrected from 'leaves'
    audit_logs, 
    tickets, 
    ticket_comments,
    interviews,
    candidates,
    job_positions -- job_applications was not in schema, assuming it's managed via candidates/positions
    RESTART IDENTITY CASCADE;

-- 2. Reset Profile Data (Keep accounts, but reset info)
UPDATE profiles 
SET 
    salary = 0,
    joining_date = CURRENT_DATE;

COMMIT;
