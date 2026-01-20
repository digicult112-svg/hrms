-- Create function to check if user is frozen
CREATE OR REPLACE FUNCTION check_user_not_frozen()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_frozen = TRUE
    ) THEN
        RAISE EXCEPTION 'Access Denied: Your account is frozen. Please contact HR.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to sensitive tables
-- 1. Attendance
DROP TRIGGER IF EXISTS ensure_not_frozen_attendance ON attendance_logs;
CREATE TRIGGER ensure_not_frozen_attendance
BEFORE INSERT OR UPDATE OR DELETE ON attendance_logs
FOR EACH ROW EXECUTE FUNCTION check_user_not_frozen();

-- 2. Leave Requests
DROP TRIGGER IF EXISTS ensure_not_frozen_leave ON leave_requests;
CREATE TRIGGER ensure_not_frozen_leave
BEFORE INSERT OR UPDATE OR DELETE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION check_user_not_frozen();

-- 3. Tickets
DROP TRIGGER IF EXISTS ensure_not_frozen_tickets ON tickets;
CREATE TRIGGER ensure_not_frozen_tickets
BEFORE INSERT OR UPDATE OR DELETE ON tickets
FOR EACH ROW EXECUTE FUNCTION check_user_not_frozen();

-- 4. Profiles (Prevent frozen user from unfreezing themselves or changing details)
DROP TRIGGER IF EXISTS ensure_not_frozen_profile ON profiles;
CREATE TRIGGER ensure_not_frozen_profile
BEFORE UPDATE ON profiles
FOR EACH ROW 
WHEN (OLD.id = auth.uid()) -- Only if the user is updating their own profile
EXECUTE FUNCTION check_user_not_frozen();
