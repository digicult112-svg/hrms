-- =====================================================================
-- FIX FOR PAYROLL GENERATION ISSUE
-- =====================================================================
-- This file fixes the frozen "Generate Payroll" button issue
-- 
-- Root cause: Missing WITH CHECK clause on payroll RLS policy
-- The policy allows HR to read (USING clause) but not insert/update (WITH CHECK)
--
-- Run this in Supabase SQL Editor
-- =====================================================================

-- Fix: Update the payroll policy to include WITH CHECK clause
DROP POLICY IF EXISTS "HR manages payroll" ON payroll;

CREATE POLICY "HR manages payroll"
ON payroll FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================================
-- VERIFICATION
-- =====================================================================
-- After running this, HR users should be able to:
-- 1. Click "Generate Payroll" button
-- 2. Fill in the payroll form (employee, salary details, month/year)
-- 3. Successfully create payroll records
-- 4. See the new payroll entries in the table
-- =====================================================================
