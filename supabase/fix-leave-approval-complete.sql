-- =====================================================================
-- COMPLETE FIX FOR LEAVE REQUEST APPROVAL ISSUE
-- =====================================================================
-- This file fixes the issue where HR cannot approve/reject leave requests
-- 
-- Root cause: Two missing RLS policies:
-- 1. Missing WITH CHECK clause on leave_requests UPDATE policy
-- 2. Missing INSERT policy on audit_logs (needed by the update trigger)
--
-- Run this entire file in Supabase SQL Editor
-- =====================================================================

-- Fix 1: Update the leave_requests policy to include WITH CHECK
DROP POLICY IF EXISTS "HR updates leave requests" ON leave_requests;

CREATE POLICY "HR updates leave requests"
ON leave_requests FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- Fix 2: Add INSERT policy for audit_logs (required by the trigger)
DROP POLICY IF EXISTS "Allow audit log inserts" ON audit_logs;

CREATE POLICY "Allow audit log inserts"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================================
-- VERIFICATION
-- =====================================================================
-- After running this, HR users should be able to:
-- 1. View all leave requests
-- 2. Approve pending leave requests
-- 3. Reject pending leave requests
-- 4. See audit logs of their actions
-- =====================================================================
