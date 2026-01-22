-- Fix the handle_new_user trigger to properly set tenant_id and other fields
-- All employee details are passed in user metadata during signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        tenant_id, 
        designation,
        phone,
        work_email,
        personal_email,
        education,
        address,
        date_of_birth,
        daily_work_hours,
        created_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'employee'),
        (new.raw_user_meta_data->>'tenant_id')::UUID,
        new.raw_user_meta_data->>'designation',
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'work_email',
        new.raw_user_meta_data->>'personal_email',
        new.raw_user_meta_data->>'education',
        new.raw_user_meta_data->>'address',
        CASE 
            WHEN new.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
            AND new.raw_user_meta_data->>'date_of_birth' != ''
            THEN (new.raw_user_meta_data->>'date_of_birth')::DATE 
            ELSE NULL 
        END,
        COALESCE((new.raw_user_meta_data->>'daily_work_hours')::INTEGER, 8),
        NOW()
    );
    RETURN new;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, just return
        RETURN new;
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Could not create profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
