-- =====================================================================
-- FIX RLS POLICIES TO USE is_hr() FUNCTION (PREVENT RECURSION)
-- =====================================================================

-- Ensure is_hr() exists (re-declaring to be safe, though it should be there)
CREATE OR REPLACE FUNCTION is_hr()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
        AND role = 'hr'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. LEAVE REQUESTS
DROP POLICY IF EXISTS "HR reads all leave requests" ON leave_requests;
CREATE POLICY "HR reads all leave requests"
ON leave_requests FOR SELECT
TO authenticated
USING (is_hr());

DROP POLICY IF EXISTS "HR updates leave requests" ON leave_requests;
CREATE POLICY "HR updates leave requests"
ON leave_requests FOR UPDATE
TO authenticated
USING (is_hr())
WITH CHECK (is_hr());

-- 2. ATTENDANCE LOGS
DROP POLICY IF EXISTS "HR reads all attendance" ON attendance_logs;
CREATE POLICY "HR reads all attendance"
ON attendance_logs FOR SELECT
TO authenticated
USING (is_hr());

-- 3. OFFICE LOCATIONS
DROP POLICY IF EXISTS "HR full control office locations" ON office_locations;
CREATE POLICY "HR full control office locations"
ON office_locations FOR ALL
TO authenticated
USING (is_hr())
WITH CHECK (is_hr());

-- 4. LEAVE CALENDAR EVENTS
DROP POLICY IF EXISTS "HR creates leave calendar" ON leave_calendar_events;
CREATE POLICY "HR creates leave calendar"
ON leave_calendar_events FOR INSERT
TO authenticated
WITH CHECK (is_hr());

DROP POLICY IF EXISTS "HR updates leave calendar" ON leave_calendar_events;
CREATE POLICY "HR updates leave calendar"
ON leave_calendar_events FOR UPDATE
TO authenticated
USING (is_hr())
WITH CHECK (is_hr());

DROP POLICY IF EXISTS "HR deletes leave calendar" ON leave_calendar_events;
CREATE POLICY "HR deletes leave calendar"
ON leave_calendar_events FOR DELETE
TO authenticated
USING (is_hr());

-- 5. PERFORMANCE SUMMARY
DROP POLICY IF EXISTS "HR reads all performance" ON performance_summary_monthly;
CREATE POLICY "HR reads all performance"
ON performance_summary_monthly FOR SELECT
TO authenticated
USING (is_hr());

-- 6. PAYROLL
DROP POLICY IF EXISTS "HR manages payroll" ON payroll;
CREATE POLICY "HR manages payroll"
ON payroll FOR ALL
TO authenticated
USING (is_hr())
WITH CHECK (is_hr());

-- 7. JOB POSITIONS
DROP POLICY IF EXISTS "HR manages job positions" ON job_positions;
CREATE POLICY "HR manages job positions"
ON job_positions FOR ALL
TO authenticated
USING (is_hr());

-- 8. CANDIDATES
DROP POLICY IF EXISTS "HR reads candidates" ON candidates;
CREATE POLICY "HR reads candidates"
ON candidates FOR SELECT
TO authenticated
USING (is_hr());

-- 9. INTERVIEWS
DROP POLICY IF EXISTS "HR manages interviews" ON interviews;
CREATE POLICY "HR manages interviews"
ON interviews FOR ALL
TO authenticated
USING (is_hr());

-- 10. AUDIT LOGS
DROP POLICY IF EXISTS "HR reads audit logs" ON audit_logs;
CREATE POLICY "HR reads audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (is_hr());
