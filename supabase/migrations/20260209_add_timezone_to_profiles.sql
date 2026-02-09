-- Add timezone support for international employees
-- This allows proper attendance tracking across different timezones

-- Add timezone column to store IANA timezone identifiers
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

-- Add exemption flag for special cases (contractors, consultants, etc.)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS exempt_from_auto_absence BOOLEAN DEFAULT FALSE;

-- Add helpful comments
COMMENT ON COLUMN public.profiles.timezone IS 
'IANA timezone identifier (e.g., America/New_York, Europe/London, Asia/Dubai). Used to convert attendance timestamps to employee local time for accurate absence detection.';

COMMENT ON COLUMN public.profiles.exempt_from_auto_absence IS 
'If true, employee will not be auto-marked as absent for missing attendance. Useful for international employees, contractors, or special work arrangements.';

-- Create index for faster queries filtering by exemption status
CREATE INDEX IF NOT EXISTS idx_profiles_exempt_from_auto_absence 
ON public.profiles(exempt_from_auto_absence) 
WHERE exempt_from_auto_absence = FALSE;
