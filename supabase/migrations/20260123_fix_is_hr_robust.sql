-- Fix: Robust is_hr() Helper
-- The previous 'is_hr()' function relied solely on JWT metadata. 
-- If the user hasn't logged out/in recently, the JWT might be missing the role, causing RLS to fail.

CREATE OR REPLACE FUNCTION public.is_hr()
RETURNS BOOLEAN AS $$
DECLARE
    jwt_role text;
BEGIN
    -- 1. Try to get from JWT first (fastest)
    SELECT (auth.jwt() -> 'app_metadata' ->> 'role') INTO jwt_role;
    
    IF jwt_role IN ('hr', 'admin') THEN
        RETURN true;
    END IF;

    -- 2. Fallback: Query the database directly
    -- This ensures that if the profile says HR, they are treated as HR even if the token is stale.
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
