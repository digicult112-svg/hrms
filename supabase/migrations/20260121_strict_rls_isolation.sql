-- Strict Multi-Tenant RLS Isolation
-- Part of Phase 7: Security Hardening

-- Update helper to be more robust
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 1. PROFILES
DROP POLICY IF EXISTS "Employee reads own profile" ON profiles;
CREATE POLICY "Employee reads own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "HR reads all profiles" ON profiles;
CREATE POLICY "HR reads all profiles" ON profiles FOR SELECT 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

-- 2. ATTENDANCE LOGS
DROP POLICY IF EXISTS "Employee inserts attendance" ON attendance_logs;
CREATE POLICY "Employee inserts attendance" ON attendance_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "Employee reads own attendance" ON attendance_logs;
CREATE POLICY "Employee reads own attendance" ON attendance_logs FOR SELECT 
USING (auth.uid() = user_id AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "HR reads all attendance" ON attendance_logs;
CREATE POLICY "HR reads all attendance" ON attendance_logs FOR SELECT 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

-- 3. LEAVE REQUESTS
DROP POLICY IF EXISTS "Employee submits leave" ON leave_requests;
CREATE POLICY "Employee submits leave" ON leave_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "Employee reads own leave requests" ON leave_requests;
CREATE POLICY "Employee reads own leave requests" ON leave_requests FOR SELECT 
USING (auth.uid() = user_id AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "HR reads all leave requests" ON leave_requests;
CREATE POLICY "HR reads all leave requests" ON leave_requests FOR SELECT 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "HR updates leave requests" ON leave_requests;
CREATE POLICY "HR updates leave requests" ON leave_requests FOR UPDATE
USING (is_hr() AND tenant_id = get_auth_tenant_id())
WITH CHECK (is_hr() AND tenant_id = get_auth_tenant_id());

-- 4. PAYROLL
DROP POLICY IF EXISTS "Employee reads own payroll" ON payroll;
CREATE POLICY "Employee reads own payroll" ON payroll FOR SELECT 
USING (auth.uid() = user_id AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "HR manages payroll" ON payroll;
CREATE POLICY "HR manages payroll" ON payroll FOR ALL
USING (is_hr() AND tenant_id = get_auth_tenant_id())
WITH CHECK (is_hr() AND tenant_id = get_auth_tenant_id());

-- 5. JOB POSITIONS & RECRUITMENT
DROP POLICY IF EXISTS "Public reads job positions" ON job_positions;
CREATE POLICY "Public reads job positions" ON job_positions FOR SELECT USING (true); -- Public jobs ok, but tenant specific jobs usually better.

DROP POLICY IF EXISTS "HR manages job positions" ON job_positions;
CREATE POLICY "HR manages job positions" ON job_positions FOR ALL 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "HR reads candidates" ON candidates;
CREATE POLICY "HR reads candidates" ON candidates FOR SELECT 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

-- 6. AUDIT LOGS
DROP POLICY IF EXISTS "HR reads audit logs" ON audit_logs;
CREATE POLICY "HR reads audit logs" ON audit_logs FOR SELECT 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "Allow audit log inserts" ON audit_logs;
CREATE POLICY "Allow audit log inserts" ON audit_logs FOR INSERT 
WITH CHECK (auth.uid() = actor_id AND tenant_id = get_auth_tenant_id());

-- 7. TICKETS (Helpdesk)
DROP POLICY IF EXISTS "Employee reads own tickets" ON tickets;
CREATE POLICY "Employee reads own tickets" ON tickets FOR SELECT 
USING (auth.uid() = employee_id AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "HR reads all tickets" ON tickets;
CREATE POLICY "HR reads all tickets" ON tickets FOR SELECT 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

-- 8. NOTIFICATIONS
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT 
USING (auth.uid() = user_id AND tenant_id = get_auth_tenant_id());
