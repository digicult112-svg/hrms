-- Function to clean up profiles deleted more than 3 months ago
CREATE OR REPLACE FUNCTION delete_expired_profiles()
RETURNS void AS $$
BEGIN
    -- Delete profiles where deleted_at is older than 3 months
    -- This will CASCADE delete related audit logs, attendance, etc.
    DELETE FROM profiles 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
