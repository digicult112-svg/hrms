-- Add status and wfh_reason columns to attendance_logs

-- Check if status column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'status') THEN
        ALTER TABLE attendance_logs ADD COLUMN status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected'));
    END IF;
END $$;

-- Check if wfh_reason column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'wfh_reason') THEN
        ALTER TABLE attendance_logs ADD COLUMN wfh_reason text;
    END IF;
END $$;

-- Update RLS policies to ensure employees can read their own pending/rejected logs
-- (Existing policy "Employee reads own attendance" should already cover this as it just checks auth.uid() = user_id)

-- Ensure HR can update attendance logs (for approvals)
-- (Existing policy "HR reads all attendance" might need to be "HR manages all attendance" or similar if not already capable of UPDATE)

-- Let's check existing policies and add/update if necessary
-- "HR reads all attendance" is SELECT only. We need UPDATE for HR.

DROP POLICY IF EXISTS "HR updates attendance" ON attendance_logs;
CREATE POLICY "HR updates attendance"
ON attendance_logs FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
