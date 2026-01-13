-- Add date_of_birth to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add index for performance on date lookups
CREATE INDEX IF NOT EXISTS idx_profiles_dob ON profiles(date_of_birth);

-- Comment
COMMENT ON COLUMN profiles.date_of_birth IS 'Date of birth of the employee';
