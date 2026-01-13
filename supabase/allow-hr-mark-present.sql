-- =====================================================================
-- FIX: ALLOW HR TO MARK OTHERS AS PRESENT (INSERT ATTENDANCE)
-- =====================================================================

-- 1. Drop existing INSERT/UPDATE policies for attendance_logs if they exist
-- (Names might vary, trying common ones or just generic drop if possible is hard without knowing names, 
-- but we can create a new permissive policy that ORs with existing ones).

-- 2. Create Policy for HR to Insert/Update any attendance log
CREATE POLICY "HR can manage all attendance logs"
ON attendance_logs
FOR ALL -- Insert, Update, Delete
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'hr'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'hr'
    )
);

-- Note: This is an additive policy. It grants HR full access to this table.
