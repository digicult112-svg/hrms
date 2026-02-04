-- Fix: Admin not seeing feedback messages
-- The issue is likely with RLS policies on anonymous_messages table

-- First, let's check current policies and drop them all to start fresh
DROP POLICY IF EXISTS "Users can insert messages" ON anonymous_messages;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON anonymous_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON anonymous_messages;
DROP POLICY IF EXISTS "Admins can view all feedback" ON anonymous_messages;

-- Ensure user_id column exists with proper constraints
ALTER TABLE anonymous_messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_user_id 
ON anonymous_messages(user_id);

-- Policy 1: Allow authenticated users to insert their own feedback
CREATE POLICY "authenticated_users_can_insert_feedback"
ON anonymous_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow admins to view all feedback
CREATE POLICY "admins_can_view_all_feedback"
ON anonymous_messages
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.deleted_at IS NULL
    )
);

-- Policy 3: Allow users to view their own feedback (optional, for future use)
CREATE POLICY "users_can_view_own_feedback"
ON anonymous_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE anonymous_messages ENABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON TABLE anonymous_messages IS 'Employee feedback messages - visible to admins and message authors';
