-- FIX CANDIDATES RLS POLICY
-- The previous policy only allowed SELECT. We need to allow INSERT and DELETE for HR.

BEGIN;

-- 1. CANDIDATES
DROP POLICY IF EXISTS "HR reads candidates" ON candidates;
DROP POLICY IF EXISTS "HR full control candidates" ON candidates;

CREATE POLICY "HR full control candidates"
ON candidates FOR ALL
TO authenticated
USING (is_hr())
WITH CHECK (is_hr());

COMMIT;
