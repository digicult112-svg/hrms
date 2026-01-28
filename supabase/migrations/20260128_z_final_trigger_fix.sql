-- This migration is the DEFINITIVE fix for the handle_new_user trigger.
-- It ensures:
-- 1. The 'Default Organization' tenant exists.
-- 2. The trigger automatically falls back to this tenant if none is provided.
-- 3. The 'role' is respected (reverting the security hardening).

-- A. Ensure Default Tenant Exists
INSERT INTO public.tenants (name, subdomain) 
VALUES ('Default Organization', 'default')
ON CONFLICT (subdomain) DO NOTHING;

-- B. Update the Trigger Function (The Robust Version)
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
        
        -- Panic safety: Create if missing (though step A should handle this)
        IF default_tenant_id IS NULL THEN
            INSERT INTO public.tenants (name, subdomain) 
            VALUES ('Default Organization', 'default')
            RETURNING id INTO default_tenant_id;
        END IF;
        
        target_tenant_id := default_tenant_id;
    END IF;

    -- 3. Create the Profile
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
        COALESCE(new.raw_user_meta_data->>'role', 'employee'), -- Respect role from frontend
        target_tenant_id, -- Use the resolved tenant_id
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
