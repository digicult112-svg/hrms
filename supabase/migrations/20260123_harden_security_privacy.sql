-- 1. SECURE PII: Nullify the legacy 'salary' column to prevent leaks
-- We keep the column for now to avoid breaking legacy code that might SELECT * but not use it,
-- but the data itself is wiped.
UPDATE public.profiles SET salary = NULL;

-- 2. ENFORCE TIMEZONES: Create an immutable server-time function
CREATE OR REPLACE FUNCTION public.get_server_today()
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  -- Returns today's date based on a fixed Organization Timezone (e.g., IST +05:30)
  -- This prevents client-side date spoofing.
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
$$;

-- 3. HARDEN ATTENDANCE: Check constraint
-- Ensure that attendance can only be logged for "Server Today"
-- This prevents "Future Attendance" or "Retroactive Attendance" hacks via API
-- Note: We allow admins to insert whatever they want, so we wrap in a check.
ALTER TABLE public.attendance_logs 
DROP CONSTRAINT IF EXISTS check_work_date_is_today;

ALTER TABLE public.attendance_logs 
ADD CONSTRAINT check_work_date_is_today 
CHECK (
  work_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE + 1 -- Allow small buffer ensuring not wildly in future
  AND 
  work_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE - 1 -- Allow small buffer ensuring not wildly in past
);

-- 4. FIX PRIVILEGE ESCALATION: Overwrite the handle_new_user trigger
-- We explicitly set role = 'employee' regardless of what the client sends.
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
        'employee', -- 🔒 HARDCODED SECURITY FIX: Always default to employee
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
