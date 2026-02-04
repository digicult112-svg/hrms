-- COMPREHENSIVE FIX: Feedback RLS Policies
-- Fixes issue where admin cannot see employee feedback

-- Step 1: Drop all existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert messages" ON anonymous_messages;
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON anonymous_messages;
    DROP POLICY IF EXISTS "Admins can view all messages" ON anonymous_messages;
    DROP POLICY IF EXISTS "Admins can view all feedback" ON anonymous_messages;
    DROP POLICY IF EXISTS "authenticated_users_can_insert_feedback" ON anonymous_messages;
    DROP POLICY IF EXISTS "admins_can_view_all_feedback" ON anonymous_messages;
    DROP POLICY IF EXISTS "users_can_view_own_feedback" ON anonymous_messages;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Step 2: Ensure user_id column exists
ALTER TABLE anonymous_messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_user_id 
ON anonymous_messages(user_id);

-- Step 4: Enable RLS if not already enabled
ALTER TABLE anonymous_messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create INSERT policy - users can only insert with their own user_id
CREATE POLICY "feedback_insert_policy"
ON anonymous_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Step 6: Create SELECT policy - admins can see all, users can see their own
CREATE POLICY "feedback_select_policy"
ON anonymous_messages
FOR SELECT
TO authenticated
USING (
    -- User can see their own feedback
    auth.uid() = user_id
    OR
    -- OR user is an admin (can see all feedback)
    EXISTS (
        SELECT 1 
        FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.deleted_at IS NULL
    )
);

-- Step 7: Grant necessary permissions
GRANT SELECT, INSERT ON anonymous_messages TO authenticated;

-- Verification: Add comment
COMMENT ON TABLE anonymous_messages IS 'Employee feedback - visible to submitter and admins';
COMMENT ON COLUMN anonymous_messages.user_id IS 'User who submitted the feedback';

-- Test query to verify policy (run this manually in SQL editor to debug)
-- SELECT * FROM anonymous_messages; -- As admin, should see all
-- SELECT * FROM profiles WHERE id = auth.uid(); -- Check your role
