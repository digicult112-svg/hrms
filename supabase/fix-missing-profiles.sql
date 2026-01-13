-- Insert missing profiles for existing auth users
INSERT INTO public.profiles (id, email, full_name, role, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'employee', -- Default role
    NOW()
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;

-- Ensure the foreign key constraint exists and is correct (optional check)
-- ALTER TABLE public.attendance_logs 
-- DROP CONSTRAINT IF EXISTS attendance_logs_user_id_fkey,
-- ADD CONSTRAINT attendance_logs_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
