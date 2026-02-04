-- FIX: Create proper foreign key relationship for feedback
-- The error "Could not find a relationship" means we need to link user_id to profiles

-- Step 1: Ensure user_id references profiles (not just auth.users)
ALTER TABLE anonymous_messages
DROP CONSTRAINT IF EXISTS anonymous_messages_user_id_fkey;

-- Add foreign key to profiles table instead of auth.users
ALTER TABLE anonymous_messages
ADD CONSTRAINT anonymous_messages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Step 2: Ensure the column exists and is properly typed
ALTER TABLE anonymous_messages
ALTER COLUMN user_id SET NOT NULL;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_user_id 
ON anonymous_messages(user_id);

-- Step 4: Verify the relationship
-- Run this to check:
-- SELECT * FROM information_schema.table_constraints 
-- WHERE table_name = 'anonymous_messages';
