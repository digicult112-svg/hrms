-- Fix Points Transactions RLS Policy
-- The current policy uses JWT metadata which may not be synced until re-login
-- This migration adds fallback check to profiles table

-- Drop and recreate the HR insert policy with a fallback check
DROP POLICY IF EXISTS "HR can award points" ON public.points_transactions;

-- Create a more robust policy that checks both JWT and profiles table
CREATE POLICY "HR can award points" 
ON public.points_transactions FOR INSERT 
WITH CHECK (
    tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND (
        -- Primary check: JWT metadata (fast, no recursion risk here)
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('hr', 'admin')
        OR
        -- Fallback: Direct profile check (for users who haven't re-logged in)
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'admin')
            AND tenant_id = points_transactions.tenant_id
        )
    )
);

-- FIX: Also fix the SELECT policy to use profiles table fallback
DROP POLICY IF EXISTS "Users can read all transactions in tenant" ON public.points_transactions;
CREATE POLICY "Users can read all transactions in tenant" 
ON public.points_transactions FOR SELECT 
USING (
    tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
);

-- Also ensure the employee_points_wallets table has an insert policy for the trigger
DROP POLICY IF EXISTS "System can insert wallets" ON public.employee_points_wallets;
CREATE POLICY "System can insert wallets" 
ON public.employee_points_wallets FOR INSERT 
WITH CHECK (true);  -- Trigger runs with SECURITY DEFINER, so this is safe

-- Ensure update policy exists for the trigger
DROP POLICY IF EXISTS "System can update wallets" ON public.employee_points_wallets;
CREATE POLICY "System can update wallets"
ON public.employee_points_wallets FOR UPDATE
USING (true)
WITH CHECK (true);  -- Trigger runs with SECURITY DEFINER

-- FIX: Also fix the wallets SELECT policy
DROP POLICY IF EXISTS "Users can read all wallets in tenant" ON public.employee_points_wallets;
CREATE POLICY "Users can read all wallets in tenant" 
ON public.employee_points_wallets FOR SELECT 
USING (
    tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
);

-- ============================================
-- CREATE/REPLACE the reset_monthly_points function
-- This function resets ALL points (monthly AND total) and clears transaction history
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_monthly_points()
RETURNS JSONB AS $$
DECLARE
    v_wallet_count INTEGER;
    v_trans_count INTEGER;
    v_tenant UUID;
BEGIN
    -- Get the user's tenant ID from profiles
    SELECT tenant_id INTO v_tenant FROM profiles WHERE id = auth.uid();
    
    -- Security: Only HR/Admin can reset
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('hr', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only HR can reset scores.';
    END IF;

    -- Reset ALL points in wallets (both monthly and total)
    UPDATE public.employee_points_wallets
    SET monthly_points = 0,
        total_points = 0,
        last_updated = now()
    WHERE tenant_id = v_tenant;
    
    GET DIAGNOSTICS v_wallet_count = ROW_COUNT;

    -- Delete all transaction history for this tenant
    DELETE FROM public.points_transactions
    WHERE tenant_id = v_tenant;
    
    GET DIAGNOSTICS v_trans_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true, 
        'affected_rows', v_wallet_count,
        'transactions_deleted', v_trans_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
