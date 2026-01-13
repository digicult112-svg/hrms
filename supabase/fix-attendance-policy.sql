-- Allow employees to update their own attendance logs (needed for clock out / pause)
CREATE POLICY "Employee updates own attendance"
ON attendance_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
