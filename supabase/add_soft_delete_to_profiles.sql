-- Add deleted_at column to profiles for Soft Delete
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Index for performance when filtering
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

COMMENT ON COLUMN profiles.deleted_at IS 'Timestamp when the employee was soft-deleted. Data is retained for 3 months.';
