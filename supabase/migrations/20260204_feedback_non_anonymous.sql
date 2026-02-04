-- Migration: Add user_id to anonymous_messages for non-anonymous feedback
-- This changes the feedback system from anonymous to attributed

-- Add user_id column to anonymous_messages table
ALTER TABLE anonymous_messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing messages to set user_id from tenant context if available
-- Note: This is best-effort for existing data
UPDATE anonymous_messages
SET user_id = auth.uid()
WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_user_id 
ON anonymous_messages(user_id);

-- Update RLS policies to ensure users can only insert with their own user_id
DROP POLICY IF EXISTS "Users can insert messages" ON anonymous_messages;

CREATE POLICY "Users can insert their own feedback"
ON anonymous_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all feedback with employee information
DROP POLICY IF EXISTS "Admins can view all messages" ON anonymous_messages;

CREATE POLICY "Admins can view all feedback"
ON anonymous_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

COMMENT ON COLUMN anonymous_messages.user_id IS 'User who submitted the feedback - no longer anonymous';
