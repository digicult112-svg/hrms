-- =====================================================================
-- RESET SCRIPT: Clear All Salary and Payroll Data
-- =====================================================================

-- 1. Clear All Profile Salaries (Set to 0)
UPDATE profiles 
SET salary = 0;

-- 2. Delete All Payroll Records (Wipe History)
DELETE FROM payroll;

-- OPTIONAL: If you want to delete attendance too, uncomment below
-- DELETE FROM attendance_logs;

-- OPTIONAL: If you want to delete leave requests too, uncomment below
-- DELETE FROM leaves;
