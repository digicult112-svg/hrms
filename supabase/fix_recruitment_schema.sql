-- ===============================================================================================
-- FIX RECRUITMENT SCHEMA MISMATCH
-- Purpose: Fixes the Foreign Key on 'candidates' table to correctly point to 'job_positions'
--          instead of 'job_position'.
-- ===============================================================================================

BEGIN;

-- 1. Create job_positions if it somehow still doesn't exist (safety check)
CREATE TABLE IF NOT EXISTS job_positions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    department text,
    status text DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at timestamptz DEFAULT now()
);

-- 2. Create candidates if missing
CREATE TABLE IF NOT EXISTS candidates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id uuid, -- Constraint added below
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    resume_url text,
    status text DEFAULT 'applied' CHECK (status IN ('applied','shortlisted','interview','selected','rejected')),
    created_at timestamptz DEFAULT now()
);

-- 3. Fix the Foreign Key Constraint
-- First, drop the incorrect constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'candidates_job_id_fkey' 
        AND table_name = 'candidates'
    ) THEN
        ALTER TABLE candidates DROP CONSTRAINT candidates_job_id_fkey;
    END IF;
END $$;

-- Now add the correct one pointing to job_positions (plural)
ALTER TABLE candidates 
    ADD CONSTRAINT candidates_job_id_fkey 
    FOREIGN KEY (job_id) 
    REFERENCES job_positions(id) 
    ON DELETE SET NULL;

COMMIT;
