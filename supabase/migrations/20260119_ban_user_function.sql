-- Ban/Unban User Functions for Soft Delete Security
-- These functions modify auth.users to block/allow authentication at database level

-- Function to ban a user (block authentication)
CREATE OR REPLACE FUNCTION ban_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- 🔒 SECURITY CHECK: Only HR or Admins can ban users
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to ban users.';
  END IF;
  -- Update auth.users to set banned_until to infinity
  UPDATE auth.users
  SET banned_until = 'infinity'::timestamptz
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users'
    );
  END IF;

  -- Also invalidate any existing sessions by updating aal
  -- This forces re-authentication which will now fail due to ban
  DELETE FROM auth.sessions WHERE user_id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'action', 'banned'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to unban a user (restore authentication) - for rollback
CREATE OR REPLACE FUNCTION unban_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- 🔒 SECURITY CHECK: Only HR or Admins can unban users
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to unban users.';
  END IF;
  -- Remove the ban by setting banned_until to NULL
  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'action', 'unbanned'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions to authenticated users
-- Note: In production, you may want to restrict this to admin/HR roles via RLS
GRANT EXECUTE ON FUNCTION ban_user TO authenticated;
GRANT EXECUTE ON FUNCTION unban_user TO authenticated;

-- Documentation
COMMENT ON FUNCTION ban_user IS 'Bans a user from authenticating by setting banned_until=infinity in auth.users. Also invalidates existing sessions.';
COMMENT ON FUNCTION unban_user IS 'Removes ban from a user, allowing them to authenticate again. Use for rollback/restore.';
