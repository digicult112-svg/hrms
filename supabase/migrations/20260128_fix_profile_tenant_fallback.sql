-- Fix profile creation by adding tenant_id fallback
-- If no tenant_id is provided in metadata, fallback to the 'default' tenant.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
    target_tenant_id UUID;
BEGIN
    -- 1. Try to get tenant_id from metadata
    target_tenant_id := (new.raw_user_meta_data->>'tenant_id')::UUID;
    
    -- 2. If null, fetch the default tenant
    IF target_tenant_id IS NULL THEN
        SELECT id INTO default_tenant_id FROM public.tenants WHERE subdomain = 'default' LIMIT 1;
        target_tenant_id := default_tenant_id;
    END IF;

    -- 3. If still null (shouldn't happen if migration ran), maybe create one or raise error?
    -- For now, we proceed. If it's null and column is NOT NULL, it will hit exception block.

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
        target_tenant_id,
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
