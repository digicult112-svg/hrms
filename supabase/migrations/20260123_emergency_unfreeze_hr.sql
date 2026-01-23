-- EMERGENCY RECOVERY
-- Unfreezes all HR and Admin accounts to restore access.

UPDATE public.profiles
SET is_frozen = false
WHERE role IN ('hr', 'admin');

-- Force schema cache reload just in case
NOTIFY pgrst, 'reload schema';
