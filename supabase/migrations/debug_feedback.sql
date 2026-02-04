-- DEBUG: Check if feedback data exists and policies work
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if feedback messages exist in the table
SELECT 
    id,
    user_id,
    message,
    created_at,
    LENGTH(message) as msg_length
FROM anonymous_messages
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check your current user's role
SELECT 
    id,
    email,
    full_name,
    role,
    deleted_at
FROM profiles
WHERE id = auth.uid();

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'anonymous_messages';

-- 4. List all policies on anonymous_messages
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'anonymous_messages';

-- 5. Test the actual query used by the app (with profile join)
SELECT 
    am.*,
    p.full_name,
    p.email,
    p.avatar_url
FROM anonymous_messages am
LEFT JOIN profiles p ON p.id = am.user_id
ORDER BY am.created_at DESC;

-- 6. Check if there's a tenant_id issue
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'anonymous_messages';
