-- Force enable Realtime for critical tables
BEGIN;
  -- Ensure the publication exists (standard in Supabase)
  -- We add the tables to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
COMMIT;

-- Ensure RLS allows access
-- 1. attendance_logs
-- We need to ensure that HR can SELECT newly inserted rows by others.
-- The existing policy "HR reads all attendance" using is_hr() should cover this.
-- we will drop and recreate to be 100% sure it's correct.

DROP POLICY IF EXISTS "HR reads all attendance" ON attendance_logs;
CREATE POLICY "HR reads all attendance"
ON attendance_logs FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'hr'
);

-- 2. system_settings
-- Ensure authenticated users can read it (for the initial fetch and updates)
DROP POLICY IF EXISTS "Read system settings" ON system_settings;
CREATE POLICY "Read system settings"
ON system_settings FOR SELECT
TO authenticated
USING (true);

-- Debugging/Testing: Insert a test setting to verify it acts on the DB
INSERT INTO system_settings (key, value, description)
VALUES ('debug_realtime_check', 'true'::jsonb, 'System check for realtime')
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb;
