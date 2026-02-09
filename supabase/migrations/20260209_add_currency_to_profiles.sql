-- Add currency support for international employees
-- This allows each employee to have salary in their local currency

-- Add currency column to store ISO 4217 currency codes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Add helpful comment
COMMENT ON COLUMN public.profiles.currency IS 
'ISO 4217 currency code (e.g., INR, USD, AED, GBP). Used for displaying salary and payslips in employee local currency.';

-- Create index for faster queries filtering by currency
CREATE INDEX IF NOT EXISTS idx_profiles_currency 
ON public.profiles(currency);
