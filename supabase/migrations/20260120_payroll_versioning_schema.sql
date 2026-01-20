-- Migration to add versioning to payroll records
-- This allows preserving historical data when payroll is regenerated.

-- 1. Add columns to the payroll table
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

-- 2. Add an index to improve query performance for current records
CREATE INDEX IF NOT EXISTS idx_payroll_is_current ON payroll(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_payroll_user_month_year ON payroll(user_id, month, year);

-- 3. Comment for documentation
COMMENT ON COLUMN payroll.version IS 'Tracks the revision number of the payroll record for a given month/year.';
COMMENT ON COLUMN payroll.is_current IS 'Boolean flag to identify the latest active record. Superseded records have this as FALSE.';
COMMENT ON COLUMN payroll.superseded_at IS 'Timestamp when this record was replaced by a newer version.';
