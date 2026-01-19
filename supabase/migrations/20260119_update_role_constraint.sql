-- Drop the existing check constraint if it exists (commonly named profiles_role_check)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new check constraint including 'admin'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('hr', 'employee', 'admin'));
