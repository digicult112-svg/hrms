-- Enable Realtime for attendance_logs
-- This is often required for the client to receive events
BEGIN;
  -- Check if the publication exists (it usually does in Supabase)
  -- If not, we create it (though supabase_realtime is standard)
  -- We'll just try to alter it.
  ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
COMMIT;

-- Verify the setting exists and is true (for testing purposes, or ensure it defaults correctly)
INSERT INTO system_settings (key, value, description)
VALUES ('enable_clock_in_notifications', 'true'::jsonb, 'Enable real-time notifications for HR when employees clock in')
ON CONFLICT (key) DO NOTHING;
