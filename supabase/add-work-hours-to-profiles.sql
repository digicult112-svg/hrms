-- Add daily_work_hours to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_work_hours integer DEFAULT 8;

-- Update RLS if necessary (existing policies usually cover new columns for owner/HR)
-- "Employee reads own profile" covers SELECT.
-- "HR updates all profiles" covers UPDATE.
