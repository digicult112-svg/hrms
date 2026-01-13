-- ===============================================================================================
-- INITIALIZE MISSING MODULES (Recruitment, Helpdesk, Announcements)
-- Purpose: Creates tables for modules that might be missing from the initial schema setup.
--          Run this BEFORE executing seed_mock_data.sql.
-- ===============================================================================================

BEGIN;

-- 1. RECRUITMENT (ATS) MODULE
-- ===============================================================================================

CREATE TABLE IF NOT EXISTS job_positions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    department text,
    status text DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    resume_url text,
    status text DEFAULT 'applied' CHECK (status IN ('applied','shortlisted','interview','selected','rejected')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
    scheduled_at timestamptz NOT NULL,
    interviewer text,
    feedback text,
    result text CHECK (result IN ('pass','fail','hold')),
    created_at timestamptz DEFAULT now()
);

-- RLS for Recruitment
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for setup)
DO $$ BEGIN
    CREATE POLICY "Public reads job positions" ON job_positions FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "HR manages job positions" ON job_positions FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 2. HELPDESK MODULE
-- ===============================================================================================

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM ('Payroll', 'IT', 'HR', 'General', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tickets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category ticket_category NOT NULL,
    priority ticket_priority DEFAULT 'Medium',
    subject text NOT NULL,
    description text NOT NULL,
    status ticket_status DEFAULT 'Open',
    assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS for Helpdesk
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;


-- 3. ANNOUNCEMENTS MODULE
-- ===============================================================================================

CREATE TABLE IF NOT EXISTS announcements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for Announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Everyone reads active announcements" ON announcements FOR SELECT TO authenticated USING (is_active = true OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "HR manages announcements" ON announcements FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
