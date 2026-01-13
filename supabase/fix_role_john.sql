-- =====================================================================
-- FIX: PROMOTE USER TO HR
-- =====================================================================

-- This script finds any user with 'john' in their name and promotes them to HR.
UPDATE profiles
SET role = 'hr'
WHERE full_name ILIKE '%john%';

-- Alternatively, you can run this to make EVERYONE HR (since you wiped data and are likely the only user)
-- UPDATE profiles SET role = 'hr';
