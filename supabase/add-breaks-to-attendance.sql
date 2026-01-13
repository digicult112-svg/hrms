-- Add columns to attendance_logs to support simple Pause/Resume functionality
-- Instead of detailed break history, we just track total paused duration and the last pause timestamp.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'total_pause_seconds') THEN
        ALTER TABLE attendance_logs ADD COLUMN total_pause_seconds integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'last_pause_time') THEN
        ALTER TABLE attendance_logs ADD COLUMN last_pause_time timestamptz;
    END IF;
    
    -- Drop breaks column if it was created by previous attempt (cleanup)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'breaks') THEN
        ALTER TABLE attendance_logs DROP COLUMN breaks;
    END IF;
END $$;
