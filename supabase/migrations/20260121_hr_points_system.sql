-- HR Points System (Recognition Module)
-- Part of Phase 13: Employee Recognition & Leaderboard

-- 1. Tables
CREATE TABLE IF NOT EXISTS public.employee_points_wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    total_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES public.profiles(id),
    points INTEGER NOT NULL,
    category TEXT NOT NULL, -- Enum: Performance, Attendance, Team contribution, Learning & growth, Initiative, Discipline
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Automatic Updates Trigger
CREATE OR REPLACE FUNCTION public.process_points_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure wallet exists for the employee
    INSERT INTO public.employee_points_wallets (user_id, tenant_id)
    VALUES (NEW.employee_id, NEW.tenant_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update points wallet
    UPDATE public.employee_points_wallets
    SET 
        total_points = total_points + NEW.points,
        monthly_points = monthly_points + NEW.points,
        last_updated = now()
    WHERE user_id = NEW.employee_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_points_transaction ON public.points_transactions;
CREATE TRIGGER on_points_transaction
AFTER INSERT ON public.points_transactions
FOR EACH ROW EXECUTE FUNCTION public.process_points_transaction();

-- 3. Monthly Reset Utility
CREATE OR REPLACE FUNCTION public.reset_monthly_points()
RETURNS JSONB AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Security: Only HR/Admin can reset
    IF NOT is_hr() THEN
        RAISE EXCEPTION 'Access Denied: Only HR can reset monthly scores.';
    END IF;

    UPDATE public.employee_points_wallets
    SET monthly_points = 0
    WHERE tenant_id = get_auth_tenant_id();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN jsonb_build_object('success', true, 'affected_rows', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies (Multi-tenant secured)
ALTER TABLE public.employee_points_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Wallets: All authenticated users read (for leaderboard), no direct mutation
DROP POLICY IF EXISTS "Users can read all wallets in tenant" ON public.employee_points_wallets;
CREATE POLICY "Users can read all wallets in tenant" 
ON public.employee_points_wallets FOR SELECT 
USING (tenant_id = get_auth_tenant_id());

-- Transactions: HR manages, Users read own or company history (Transparency)
DROP POLICY IF EXISTS "HR can award points" ON public.points_transactions;
CREATE POLICY "HR can award points" 
ON public.points_transactions FOR INSERT 
WITH CHECK (is_hr() AND tenant_id = get_auth_tenant_id());

DROP POLICY IF EXISTS "Users can read all transactions in tenant" ON public.points_transactions;
CREATE POLICY "Users can read all transactions in tenant" 
ON public.points_transactions FOR SELECT 
USING (tenant_id = get_auth_tenant_id());

-- 5. Seeding Wallets for existing users
INSERT INTO public.employee_points_wallets (user_id, tenant_id)
SELECT id, tenant_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
