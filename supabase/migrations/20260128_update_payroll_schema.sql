-- FIX: Add missing columns to 'payroll' table.
-- The RPC expects these columns to store the breakdown of the salary.

DO $$
BEGIN
    -- 1. Add 'net_salary'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'net_salary') THEN
        ALTER TABLE public.payroll ADD COLUMN net_salary NUMERIC DEFAULT 0;
    END IF;

    -- 2. Add 'hra'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'hra') THEN
        ALTER TABLE public.payroll ADD COLUMN hra NUMERIC DEFAULT 0;
    END IF;

    -- 3. Add 'allowances'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'allowances') THEN
        ALTER TABLE public.payroll ADD COLUMN allowances NUMERIC DEFAULT 0;
    END IF;

    -- 4. Add 'deductions'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'deductions') THEN
        ALTER TABLE public.payroll ADD COLUMN deductions NUMERIC DEFAULT 0;
    END IF;

    -- 5. Add 'metadata' if it's missing (RPC uses it too)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'metadata') THEN
        ALTER TABLE public.payroll ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 6. Ensure 'generated_at' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'generated_at') THEN
        ALTER TABLE public.payroll ADD COLUMN generated_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
END $$;
