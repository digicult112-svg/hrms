-- =====================================================================
-- FIX: Payroll Duplicates and Updates
-- =====================================================================

-- 1. Remove duplicate payroll entries (keeping the latest one based on generated_at or id)
-- We keep the one with the HIGHEST id (presumably latest)
DELETE FROM payroll a 
USING payroll b 
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.month = b.month 
  AND a.year = b.year;

-- 2. Add Unique Constraint to prevent future duplicates
ALTER TABLE payroll 
    ADD CONSTRAINT payroll_user_month_year_unique 
    UNIQUE (user_id, month, year);

-- 3. Ensure 'salary' column exists in profiles (Safety check)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary numeric DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_work_hours numeric DEFAULT 8;
