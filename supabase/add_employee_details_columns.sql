
-- Add new columns to profiles table for employee details
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS previous_experience text,
ADD COLUMN IF NOT EXISTS previous_role text,
ADD COLUMN IF NOT EXISTS previous_company text,
ADD COLUMN IF NOT EXISTS address text CHECK (char_length(address) <= 50);
