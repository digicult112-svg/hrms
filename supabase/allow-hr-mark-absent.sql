-- =====================================================================
-- FIX: ALLOW HR TO MARK ABSENT (INSERT LEAVES FOR OTHERS)
-- =====================================================================
-- Currently, the INSERT policy likely restricts users to only insert 
-- rows where user_id = auth.uid(). This prevents HR from "Marking Absent"
-- which technically creates a leave request for another user.

-- 1. Drop existing INSERT policies to avoid confusion/conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON leave_requests;
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;

-- 2. Re-create: Policy for Self-Service (Everyone)
CREATE POLICY "Users can insert own leave requests"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- 3. Re-create: Policy for HR (Can insert for anyone)
CREATE POLICY "HR can insert leave requests for any user"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'hr'
    )
);

-- Note: RLS policies are "OR"ed together. So a user will pass if EITHER
-- they are inserting for themself OR they are an HR.
