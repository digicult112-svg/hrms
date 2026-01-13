-- Comprehensive fix for Payroll features
-- 1. Ensure metadata column exists
ALTER TABLE public.payroll
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Enable RLS
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- 3. Reset RLS Policy for HR
DROP POLICY IF EXISTS "HR manages payroll" ON public.payroll;
DROP POLICY IF EXISTS "Users can view own payroll" ON public.payroll;

CREATE POLICY "HR manages payroll"
ON public.payroll
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'hr'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'hr'
);

-- 4. Allow users to view their own payroll
CREATE POLICY "Users can view own payroll"
ON public.payroll
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- 5. Grant permissions
GRANT ALL ON public.payroll TO authenticated;
GRANT ALL ON public.payroll TO service_role;
