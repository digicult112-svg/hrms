-- Revert the hardcoded security fix to allow role selection during signup
-- This allows the 'role' field from user_metadata to be used when creating the profile.

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
        COALESCE(new.raw_user_meta_data->>'role', 'employee'), -- Allow role from metadata
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
        RETURN new;
    WHEN OTHERS THEN
        RAISE WARNING 'Could not create profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
