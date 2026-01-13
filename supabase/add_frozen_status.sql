-- Add is_frozen column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_frozen boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN profiles.is_frozen IS 'If true, the employee is restricted from logging in or performing actions.';
