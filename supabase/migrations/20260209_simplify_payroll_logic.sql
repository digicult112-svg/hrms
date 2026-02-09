-- Simplify Payroll Logic
-- 1. Base Salary is strictly Monthly.
-- 2. HRA and Tax are REMOVED (Set to 0).
-- 3. Deduction Calculation:
--    - Per Day Salary = Base Salary / 30 (Fixed).
--    - Allowed Paid Leaves = 1.
--    - Deductible Days = GREATEST(0, Absent Days - 1).
--    - Deduction Amount = Deductible Days * Per Day Salary.

CREATE OR REPLACE FUNCTION public.generate_payroll_batch(
    payroll_records JSONB[], 
    target_month INTEGER, 
    target_year INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec JSONB;
    user_id_val UUID;
    tenant_id_val UUID;
    
    -- Inputs or Lookups
    base_salary_val NUMERIC;
    
    -- Calculated
    hra_val NUMERIC := 0;
    allowances_val NUMERIC := 0;
    deductions_val NUMERIC := 0;
    net_salary_val NUMERIC;
    
    -- Metadata
    meta JSONB;
    lop_days NUMERIC;
    lop_amount NUMERIC;
    
    processed_count INTEGER := 0;
    current_timestamp TIMESTAMPTZ := NOW();
BEGIN
    FOR rec IN SELECT * FROM unnest(payroll_records)
    LOOP
        user_id_val := (rec->>'user_id')::UUID;
        
        -- 1. Get Tenant ID
        SELECT tenant_id INTO tenant_id_val FROM public.profiles WHERE id = user_id_val;
        
        -- 2. Determine Base Salary
        IF rec->>'base_salary' IS NOT NULL AND (rec->>'base_salary')::NUMERIC > 0 THEN
             base_salary_val := (rec->>'base_salary')::NUMERIC;
             
             -- Update Master Table
             INSERT INTO public.salaries (user_id, amount, tenant_id, updated_at)
             VALUES (user_id_val, base_salary_val, tenant_id_val, current_timestamp)
             ON CONFLICT (user_id) DO UPDATE 
             SET amount = EXCLUDED.amount, updated_at = EXCLUDED.updated_at;
        ELSE
             SELECT amount INTO base_salary_val FROM public.salaries WHERE user_id = user_id_val;
             base_salary_val := COALESCE(base_salary_val, 0);
        END IF;

        -- 3. Calculate Deductions (Simplified Logic)
        -- We expect 'lop_days' to be passed in metadata from the frontend calculation usually,
        -- OR we just take the deductions passed directly if it was pre-calculated.
        -- However, this RPC is often called with just user_id for regeneration. 
        -- IF metadata is missing, we assume 0 deductions (Full Salary) for quick updates,
        -- UNLESS deductions are explicitly passed.
        
        deductions_val := COALESCE((rec->>'deductions')::NUMERIC, 0);
        meta := COALESCE(rec->'metadata', '{}'::jsonb);
        
        -- If deductions were passed, use them. 
        -- In the simplified model, Tax is 0. HRA is 0.
        
        net_salary_val := base_salary_val - deductions_val;
        
        -- Ensure non-negative
        IF net_salary_val < 0 THEN net_salary_val := 0; END IF;

        -- 4. Mark old records as not current (Versioning)
        UPDATE public.payroll 
        SET is_current = false 
        WHERE user_id = user_id_val 
          AND month = target_month 
          AND year = target_year;

        -- 5. Insert New Record
        INSERT INTO public.payroll (
            user_id,
            month,
            year,
            base_salary,
            hra,
            allowances,
            deductions,
            net_salary,
            is_current,
            status,
            tenant_id,
            generated_at,
            metadata
        )
        VALUES (
            user_id_val,
            target_month,
            target_year,
            base_salary_val,
            0, -- HRA removed
            0, -- Allowances removed
            deductions_val,
            net_salary_val,
            true,
            'processed',
            tenant_id_val,
            current_timestamp,
            meta
        );

        processed_count := processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'processed_count', processed_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$$;
