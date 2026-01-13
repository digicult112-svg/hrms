
-- Add work_email and personal_email to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS work_email text,
ADD COLUMN IF NOT EXISTS personal_email text;

-- Backfill work_email from existing email for now
UPDATE profiles
SET work_email = email
WHERE work_email IS NULL;

-- Optional: Add a check to ensure at least one is present?
-- Actually, strict SQL check might be annoying if data is in flux, 
-- but we can add it if we are confident.
-- For now, let's rely on application logic + 'NOT NULL' on basic email column if it existed.
-- The requested logic "at least one" is best handled in UI for specific fields, 
-- but let's just make sure the columns exist.
