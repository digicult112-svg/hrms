-- Fix HR leave request update policy
-- The existing policy is missing the WITH CHECK clause which prevents updates

DROP POLICY IF EXISTS "HR updates leave requests" ON leave_requests;

CREATE POLICY "HR updates leave requests"
ON leave_requests FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
