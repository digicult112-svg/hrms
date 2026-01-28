-- 1. Ensure the 'default' tenant exists. 
-- If it's missing, the trigger fallback fails, causing profile creation to fail.
INSERT INTO public.tenants (name, subdomain) 
VALUES ('Default Organization', 'default')
ON CONFLICT (subdomain) DO NOTHING;

-- 2. Refine the trigger to be even more robust.
-- If for some reason the SELECT fails, we should handle it (though step 1 helps).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
    target_tenant_id UUID;
BEGIN
    -- Try to get tenant_id from metadata
    target_tenant_id := (new.raw_user_meta_data->>'tenant_id')::UUID;
    
    -- If null, fetch the default tenant
    IF target_tenant_id IS NULL THEN
        SELECT id INTO default_tenant_id FROM public.tenants WHERE subdomain = 'default' LIMIT 1;
        
        -- If still null (panic mode), create it on the fly
        IF default_tenant_id IS NULL THEN
            INSERT INTO public.tenants (name, subdomain) 
            VALUES ('Default Organization', 'default')
            RETURNING id INTO default_tenant_id;
        END IF;
        
        target_tenant_id := default_tenant_id;
    END IF;

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
