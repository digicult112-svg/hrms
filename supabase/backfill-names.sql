-- Backfill missing full_name in profiles table
-- This script sets the full_name to the part of the email before '@'
-- ONLY for rows where full_name is NULL or an empty string.

UPDATE public.profiles
SET full_name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL OR full_name = '';

-- Optional: Verify the changes
-- SELECT * FROM public.profiles;
