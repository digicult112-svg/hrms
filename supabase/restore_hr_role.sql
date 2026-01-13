-- =====================================================================
-- RESTORE HR ROLE
-- =====================================================================
-- Replace 'ENTER_YOUR_HR_EMAIL_HERE' with your actual email address.

UPDATE profiles
SET role = 'hr'
WHERE email = 'asif@gmail.com'; -- Example email, change this!

-- Note: If you don't know the exact email, you can check the profiles table:
-- SELECT * FROM profiles;
