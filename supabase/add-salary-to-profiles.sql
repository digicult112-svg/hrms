-- Add salary column to profiles table
-- This is needed to store the fixed base salary for each employee

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'salary') THEN
        ALTER TABLE profiles ADD COLUMN salary numeric DEFAULT 0;
    END IF;
END $$;
