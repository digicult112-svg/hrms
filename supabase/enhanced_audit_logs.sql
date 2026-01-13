-- Add new columns for better auditing
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id uuid;

-- Fix RLS to allow users to see logs about THEMSELVES (target_id)
DROP POLICY IF EXISTS "HR reads audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow audit log inserts" ON audit_logs;

CREATE POLICY "HR reads all audit logs" 
ON audit_logs FOR SELECT 
TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

CREATE POLICY "Users read own audit logs" 
ON audit_logs FOR SELECT 
TO authenticated 
USING (target_id = auth.uid() OR actor_id = auth.uid());

CREATE POLICY "System inserts audit logs" 
ON audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- =========================================================
-- TRIGGER: Audit Profile Changes (Salary, Designation, etc)
-- =========================================================
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS trigger AS $$
BEGIN
    -- Salary Change
    IF OLD.salary IS DISTINCT FROM NEW.salary THEN
        INSERT INTO audit_logs (actor_id, target_id, action, table_name, row_id, details)
        VALUES (
            auth.uid(), -- actor (could be HR)
            NEW.id,     -- target (the employee)
            'Salary Updated', 
            'profiles', 
            NEW.id, 
            'Base Salary changed from ' || COALESCE(OLD.salary, 0) || ' to ' || COALESCE(NEW.salary, 0)
        );
    END IF;

    -- Designation Change
    IF OLD.designation IS DISTINCT FROM NEW.designation THEN
        INSERT INTO audit_logs (actor_id, target_id, action, table_name, row_id, details)
        VALUES (
            auth.uid(), 
            NEW.id, 
            'Designation Updated', 
            'profiles', 
            NEW.id, 
            'Designation changed from ' || COALESCE(OLD.designation, 'None') || ' to ' || COALESCE(NEW.designation, 'None')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_profiles ON profiles;
CREATE TRIGGER trg_audit_profiles
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION audit_profile_changes();

-- =========================================================
-- TRIGGER: Audit Attendance (Clock In / Out)
-- =========================================================
CREATE OR REPLACE FUNCTION audit_attendance_events()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (actor_id, target_id, action, table_name, row_id, details)
        VALUES (
            NEW.user_id, 
            NEW.user_id, 
            'Clock In', 
            'attendance_logs', 
            NEW.id, 
            'Clocked in via ' || NEW.mode || ' at ' || to_char(NEW.clock_in, 'HH12:MI AM')
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Clock Out
        IF OLD.clock_out IS NULL AND NEW.clock_out IS NOT NULL THEN
             INSERT INTO audit_logs (actor_id, target_id, action, table_name, row_id, details)
            VALUES (
                NEW.user_id, 
                NEW.user_id, 
                'Clock Out', 
                'attendance_logs', 
                NEW.id, 
                'Clocked out at ' || to_char(NEW.clock_out, 'HH12:MI AM') || '. Duration: ' || NEW.total_hours || 'h'
            );
        END IF;

        -- Status Change (e.g., WFH Approval)
        IF OLD.status IS DISTINCT FROM NEW.status THEN
             INSERT INTO audit_logs (actor_id, target_id, action, table_name, row_id, details)
            VALUES (
                auth.uid(), 
                NEW.user_id, 
                'Attendance ' || INITCAP(NEW.status), 
                'attendance_logs', 
                NEW.id, 
                'Attendance status changed to ' || NEW.status
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_attendance ON attendance_logs;
CREATE TRIGGER trg_audit_attendance
AFTER INSERT OR UPDATE ON attendance_logs
FOR EACH ROW
EXECUTE FUNCTION audit_attendance_events();

-- =========================================================
-- TRIGGER: Audit Payroll Generation
-- =========================================================
CREATE OR REPLACE FUNCTION audit_payroll_events()
RETURNS trigger AS $$
BEGIN
    INSERT INTO audit_logs (actor_id, target_id, action, table_name, row_id, details)
    VALUES (
        auth.uid(), 
        NEW.user_id, 
        'Payroll Generated', 
        'payroll', 
        NEW.id, 
        'Payroll generated for ' || to_char(to_date(NEW.month::text, 'MM'), 'Month') || ' ' || NEW.year || '. Net: ' || (NEW.base_salary + NEW.hra + NEW.allowances - NEW.deductions)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_payroll ON payroll;
CREATE TRIGGER trg_audit_payroll
AFTER INSERT ON payroll
FOR EACH ROW
EXECUTE FUNCTION audit_payroll_events();
