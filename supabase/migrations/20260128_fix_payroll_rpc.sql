-- DEFINITIVE FIX for Payroll RPC
-- Redefines generate_payroll_batch to accept direct base_salary input.
-- This bypasses the need for the frontend to strictly upsert to a separate table first.

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
    hra_val NUMERIC;
    allowances_val NUMERIC := 0;
    deductions_val NUMERIC := 0;
    
    -- Calculated
    net_salary_val NUMERIC;
    processed_count INTEGER := 0;
    current_timestamp TIMESTAMPTZ := NOW();
BEGIN
    FOR rec IN SELECT * FROM unnest(payroll_records)
    LOOP
        user_id_val := (rec->>'user_id')::UUID;
        
        -- 1. Get Tenant ID (Crucial for RLS insert)
        SELECT tenant_id INTO tenant_id_val FROM public.profiles WHERE id = user_id_val;
        
        -- 2. Determine Base Salary
        -- Priority: Input JSON > Salaries Table > 0 (Fallback)
        IF rec->>'base_salary' IS NOT NULL AND (rec->>'base_salary')::NUMERIC > 0 THEN
             base_salary_val := (rec->>'base_salary')::NUMERIC;
             
             -- OPTIONAL: Auto-save this to the master table for next time
             INSERT INTO public.salaries (user_id, amount, tenant_id, updated_at)
             VALUES (user_id_val, base_salary_val, tenant_id_val, current_timestamp)
             ON CONFLICT (user_id) DO UPDATE 
             SET amount = EXCLUDED.amount, updated_at = EXCLUDED.updated_at;
             
        ELSE
             SELECT amount INTO base_salary_val FROM public.salaries WHERE user_id = user_id_val;
             base_salary_val := COALESCE(base_salary_val, 0);
        END IF;

        -- 3. Calculate Components (Simple logic for now, can be expanded)
        -- HRA = 40% of Basic (Default logic if not provided)
        hra_val := COALESCE((rec->>'hra')::NUMERIC, ROUND(base_salary_val * 0.40));
        allowances_val := COALESCE((rec->>'allowances')::NUMERIC, 0);
        deductions_val := COALESCE((rec->>'deductions')::NUMERIC, 0);
        
        -- Net Salary Calculation
        net_salary_val := base_salary_val + hra_val + allowances_val - deductions_val;

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
            hra_val,
            allowances_val,
            deductions_val,
            net_salary_val,
            true,
            'processed',
            tenant_id_val,
            current_timestamp,
            COALESCE(rec->'metadata', '{}'::jsonb)
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
