-- Create a function to check frozen status for RLS
CREATE OR REPLACE FUNCTION is_user_frozen(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND is_frozen = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Attendance Logs Policies to prevent actions if frozen

-- Drop existing policy if it conflicts or just add a restrictive condition
-- Best way without complex migration of all policies is to add a CHECK on INSERT/UPDATE
-- that ensures the user is NOT frozen.

-- Policy: Frozen Users Cannot Insert Attendance
CREATE POLICY "Frozen users cannot insert attendance"
ON attendance_logs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  NOT is_user_frozen(auth.uid())
);

-- Note: We can't easily "alter" existing policies to add this condition without dropping-recreating them.
-- However, since RLS is permisisve (OR), if an "Allow Insert" policy exists, adding another one won't restrict it.
-- We must UPDATE the existing policies or use a TRIGGER to enforce this strictly.

-- TRIGGER APPROACH (More Robust for Blocking)
CREATE OR REPLACE FUNCTION check_frozen_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_frozen FROM profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Account is frozen. Action denied.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limit this trigger to tables where user action is critical
DROP TRIGGER IF EXISTS check_freeze_attendance ON attendance_logs;
CREATE TRIGGER check_freeze_attendance
BEFORE INSERT OR UPDATE ON attendance_logs
FOR EACH ROW
EXECUTE FUNCTION check_frozen_status_trigger();

DROP TRIGGER IF EXISTS check_freeze_leaves ON leave_requests;
CREATE TRIGGER check_freeze_leaves
BEFORE INSERT OR UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION check_frozen_status_trigger();
