-- Enterprise Hardening: Attendance Snapshotting
-- Part of Phase 9: Final Polish

-- 1. Add attendance_snapshot column to payroll
-- This stores a JSONB array of the attendance logs used for this calculation
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS attendance_snapshot JSONB;

-- 2. Add comment for documentation
COMMENT ON COLUMN public.payroll.attendance_snapshot IS 'Immutable snapshot of attendance data used to calculate this specific payroll record.';
