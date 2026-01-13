-- =====================================================================
-- EDGE FUNCTION FOR CREATING EMPLOYEES
-- =====================================================================
-- This function allows HR users to create new employee accounts
-- It uses the service role to bypass RLS and create auth users

CREATE OR REPLACE FUNCTION create_employee(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_designation text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Check if caller is HR
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'hr' THEN
    RAISE EXCEPTION 'Only HR users can create employees';
  END IF;

  -- Note: This function requires the service role key to create auth users
  -- For production, use a Supabase Edge Function instead
  -- This is a placeholder that returns the expected structure
  
  RETURN json_build_object(
    'success', false,
    'message', 'Please use the Edge Function endpoint to create employees',
    'user_id', null
  );
END;
$$;
