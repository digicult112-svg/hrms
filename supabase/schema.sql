-- =====================================================================
-- FINAL HRMS DATABASE SCHEMA (CLEAN + ERROR-FREE)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- DROP EXISTING TABLES (SAFE RESET)
-- =====================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS job_positions CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS performance_summary_monthly CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS leave_calendar_events CASCADE;
DROP TABLE IF EXISTS office_locations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================================
-- 1. PROFILES TABLE
-- =====================================================================
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'employee' CHECK (role IN ('hr','employee')),
    designation text,
    phone text,
    date_joined date DEFAULT CURRENT_DATE,
    base_location_id uuid,
    created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 2. OFFICE LOCATIONS
-- =====================================================================
CREATE TABLE office_locations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    radius_m integer NOT NULL DEFAULT 1000,
    created_at timestamptz DEFAULT now()
);

INSERT INTO office_locations (name, latitude, longitude, radius_m)
VALUES ('Main Office', 12.9716, 77.5946, 1000);

-- =====================================================================
-- 3. LEAVE CALENDAR EVENTS (HOLIDAYS)
-- =====================================================================
CREATE TABLE leave_calendar_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    event_date date NOT NULL,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 4. ATTENDANCE LOGS
-- =====================================================================
CREATE TABLE attendance_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    work_date date DEFAULT CURRENT_DATE,
    mode text NOT NULL CHECK (mode IN ('onsite','wfh')),
    clock_in timestamptz,
    clock_out timestamptz,
    geo_lat double precision,
    geo_lon double precision,
    wfh_report text,
    total_hours numeric,
    created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 5. LEAVE REQUESTS
-- =====================================================================
CREATE TABLE leave_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    hr_comment text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_leave_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_leave
BEFORE UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_timestamp();

-- =====================================================================
-- 6. PERFORMANCE SUMMARY
-- =====================================================================
CREATE TABLE performance_summary_monthly (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    year int NOT NULL,
    month int NOT NULL,
    total_hours numeric DEFAULT 0,
    total_leaves int DEFAULT 0,
    generated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, year, month)
);

-- =====================================================================
-- 7. PAYROLL
-- =====================================================================
CREATE TABLE payroll (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    base_salary numeric NOT NULL,
    hra numeric DEFAULT 0,
    allowances numeric DEFAULT 0,
    deductions numeric DEFAULT 0,
    month int NOT NULL,
    year int NOT NULL,
    generated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 8. RECRUITMENT (ATS)
-- =====================================================================
CREATE TABLE job_positions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    department text,
    status text DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE candidates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    resume_url text,
    status text DEFAULT 'applied' CHECK (status IN ('applied','shortlisted','interview','selected','rejected')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE interviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
    scheduled_at timestamptz NOT NULL,
    interviewer text,
    feedback text,
    result text CHECK (result IN ('pass','fail','hold')),
    created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- 9. AUDIT LOGS
-- =====================================================================
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id uuid REFERENCES profiles(id),
    action text NOT NULL,
    table_name text NOT NULL,
    row_id uuid,
    timestamp timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_leave_audit()
RETURNS trigger AS $$
BEGIN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id)
    VALUES (NEW.user_id, 'Leave Request Updated', 'leave_requests', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_leave
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION log_leave_audit();

-- =====================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_summary_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;  -- FIXED ✔
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SECURITY POLICIES
-- =====================================================================

-- =====================================================
-- PROFILES
-- =====================================================
CREATE POLICY "Employee reads own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Employee updates own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "HR reads all profiles"
ON profiles FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

CREATE POLICY "HR updates all profiles"
ON profiles FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- OFFICE LOCATIONS (FIXED)
-- =====================================================
CREATE POLICY "Employees read office locations"
ON office_locations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "HR full control office locations"
ON office_locations FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- LEAVE CALENDAR EVENTS (FIXED)
-- =====================================================
CREATE POLICY "Users read leave calendar"
ON leave_calendar_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "HR creates leave calendar"
ON leave_calendar_events FOR INSERT
TO authenticated
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

CREATE POLICY "HR updates leave calendar"
ON leave_calendar_events FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

CREATE POLICY "HR deletes leave calendar"
ON leave_calendar_events FOR DELETE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- ATTENDANCE LOGS
-- =====================================================
CREATE POLICY "Employee inserts attendance"
ON attendance_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employee reads own attendance"
ON attendance_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "HR reads all attendance"
ON attendance_logs FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- LEAVE REQUESTS
-- =====================================================
CREATE POLICY "Employee submits leave"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employee reads own leave requests"
ON leave_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "HR reads all leave requests"
ON leave_requests FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

CREATE POLICY "HR updates leave requests"
ON leave_requests FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- PERFORMANCE
-- =====================================================
CREATE POLICY "Employee reads own performance"
ON performance_summary_monthly FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "HR reads all performance"
ON performance_summary_monthly FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- PAYROLL
-- =====================================================
CREATE POLICY "Employee reads own payroll"
ON payroll FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "HR manages payroll"
ON payroll FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- JOB POSITIONS
-- =====================================================
CREATE POLICY "Public reads job positions"
ON job_positions FOR SELECT
TO public
USING (true);

CREATE POLICY "HR manages job positions"
ON job_positions FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- CANDIDATES
-- =====================================================
CREATE POLICY "Public applies for job"
ON candidates FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "HR reads candidates"
ON candidates FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- INTERVIEWS
-- =====================================================
CREATE POLICY "HR manages interviews"
ON interviews FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE POLICY "HR reads audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

CREATE POLICY "Allow audit log inserts"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
