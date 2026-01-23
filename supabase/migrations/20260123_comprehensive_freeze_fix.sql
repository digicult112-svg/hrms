-- Comprehensive Fix for Employee Freeze/Unfreeze Functionality
-- This migration ensures the column exists and creates a reliable RPC function

-- 1. Ensure is_frozen column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_frozen'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_frozen BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create RPC function to toggle freeze status (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.toggle_employee_freeze(employee_id UUID)
RETURNS JSONB AS $$
DECLARE
    caller_role TEXT;
    current_freeze_status BOOLEAN;
    new_freeze_status BOOLEAN;
BEGIN
    -- Check if caller is HR or Admin
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    
    IF caller_role NOT IN ('hr', 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Only HR can freeze/unfreeze employee accounts';
    END IF;

    -- Get current freeze status
    SELECT is_frozen INTO current_freeze_status 
    FROM public.profiles 
    WHERE id = employee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;

    -- Toggle the status
    new_freeze_status := NOT current_freeze_status;
    
    UPDATE public.profiles 
    SET is_frozen = new_freeze_status 
    WHERE id = employee_id;

    -- Return the new status
    RETURN jsonb_build_object(
        'success', true,
        'employee_id', employee_id,
        'is_frozen', new_freeze_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Force schema cache reload
NOTIFY pgrst, 'reload schema';
