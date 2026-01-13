-- =====================================================================
-- FIX: AUTOMATIC USER PROFILE CREATION WITH ROLE
-- =====================================================================
-- This function runs every time a new user signs up.
-- It correctly extracts the 'role' from the sign-up metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        -- Fallback to 'New User' if metadata is missing
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        -- CRITICAL: Use the role passed during signup, default to 'employee'
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
