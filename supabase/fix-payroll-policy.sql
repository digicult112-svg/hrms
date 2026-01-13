-- Fix payroll RLS policy to allow HR to insert payroll records
-- The existing policy is missing the WITH CHECK clause

DROP POLICY IF EXISTS "HR manages payroll" ON payroll;

CREATE POLICY "HR manages payroll"
ON payroll FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
