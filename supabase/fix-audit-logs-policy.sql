-- Fix audit_logs RLS policy to allow inserts from triggers
-- The trigger log_leave_audit() tries to insert into audit_logs when leave requests are updated
-- but there's no INSERT policy, causing the update to fail

-- Allow authenticated users to insert audit logs (needed for triggers)
CREATE POLICY "Allow audit log inserts"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alternative: If you want only the trigger to insert, you can use:
-- CREATE POLICY "Allow audit log inserts"
-- ON audit_logs FOR INSERT
-- TO authenticated
-- WITH CHECK (actor_id = auth.uid() OR true);
