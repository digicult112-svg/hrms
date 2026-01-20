-- Seed Payroll Settings if they don't exist
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('payroll_hra_percentage', '40', 'Standard House Rent Allowance percentage (defaults to 40)'),
    ('payroll_tax_slab_1_threshold', '25000', 'Lower salary threshold for tax (5%)'),
    ('payroll_tax_slab_2_threshold', '50000', 'Middle salary threshold for tax (10%)'),
    ('payroll_tax_slab_3_threshold', '100000', 'Upper salary threshold for tax (15%)')
ON CONFLICT (key) DO NOTHING;

-- Update Payroll Function to use dynamic parameters
CREATE OR REPLACE FUNCTION generate_payroll_batch(
  payroll_records JSONB,
  target_month INTEGER,
  target_year INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  record_item JSONB;
  processed_count INTEGER := 0;
  superseded_count INTEGER := 0;
  curr_user_id UUID;
  
  -- Settings
  start_day INTEGER := 26;
  end_day INTEGER := 25;
  tax_enabled BOOLEAN := TRUE;
  paid_leaves_per_month INTEGER := 1;
  hra_percentage NUMERIC := 40;
  
  -- Tax Slabs
  tax_slab_1_limit NUMERIC;
  tax_slab_2_limit NUMERIC;
  tax_slab_3_limit NUMERIC;
  
  -- Cycle Dates
  cycle_start DATE;
  cycle_end DATE;
  total_days_in_cycle INTEGER;
  
  -- Calculation Vars
  emp_base_salary NUMERIC;
  present_days INTEGER;
  holiday_count INTEGER;
  weekend_count INTEGER;
  approved_leave_days INTEGER;
  paid_leaves_used INTEGER;
  paid_days INTEGER;
  lop_days NUMERIC;
  lop_amount NUMERIC;
  tax_amount NUMERIC := 0;
  net_salary NUMERIC;
  
  calc_metadata JSONB;
BEGIN
  -- 🔒 SECURITY CHECK: Only HR or Admins can generate payroll
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to generate payroll.';
  END IF;

  -- Step 1: Fetch System Settings
  SELECT COALESCE((SELECT value::INTEGER FROM system_settings WHERE key = 'payroll_start_day'), 26) INTO start_day;
  SELECT COALESCE((SELECT value::INTEGER FROM system_settings WHERE key = 'payroll_end_day'), 25) INTO end_day;
  SELECT COALESCE((SELECT value::BOOLEAN FROM system_settings WHERE key = 'payroll_tax_enabled'), TRUE) INTO tax_enabled;
  SELECT COALESCE((SELECT value::INTEGER FROM system_settings WHERE key = 'payroll_paid_leaves_per_month'), 1) INTO paid_leaves_per_month;
  SELECT COALESCE((SELECT value::NUMERIC FROM system_settings WHERE key = 'payroll_hra_percentage'), 40) INTO hra_percentage;
  
  SELECT COALESCE((SELECT value::NUMERIC FROM system_settings WHERE key = 'payroll_tax_slab_1_threshold'), 25000) INTO tax_slab_1_limit;
  SELECT COALESCE((SELECT value::NUMERIC FROM system_settings WHERE key = 'payroll_tax_slab_2_threshold'), 50000) INTO tax_slab_2_limit;
  SELECT COALESCE((SELECT value::NUMERIC FROM system_settings WHERE key = 'payroll_tax_slab_3_threshold'), 100000) INTO tax_slab_3_limit;

  -- Step 2: Calculate Cycle Range
  cycle_start := (target_year || '-' || target_month || '-' || start_day)::DATE - INTERVAL '1 month';
  cycle_end := (target_year || '-' || target_month || '-' || end_day)::DATE;
  total_days_in_cycle := (cycle_end - cycle_start) + 1;

  -- Step 3: Iterate through records
  FOR record_item IN SELECT * FROM jsonb_array_elements(payroll_records)
  LOOP
    curr_user_id := (record_item->>'user_id')::UUID;

    -- Fetch Employee Base Salary from NEW SALARIES table
    SELECT amount INTO emp_base_salary FROM salaries WHERE user_id = curr_user_id;
    CONTINUE WHEN emp_base_salary IS NULL OR emp_base_salary = 0;

    -- A. Count Present Days
    SELECT COUNT(DISTINCT work_date) INTO present_days
    FROM attendance_logs
    WHERE user_id = curr_user_id
      AND work_date BETWEEN cycle_start AND cycle_end
      AND (mode = 'onsite' OR (mode IN ('wfh', 'remote') AND status = 'approved'));

    -- B. Count Holidays
    SELECT COUNT(*) INTO holiday_count
    FROM leave_calendar_events
    WHERE event_date BETWEEN cycle_start AND cycle_end;

    -- C. Count Weekends
    WITH date_series AS (
      SELECT generate_series(cycle_start, cycle_end, '1 day'::interval)::date AS d
    )
    SELECT COUNT(*) INTO weekend_count
    FROM date_series
    WHERE EXTRACT(DOW FROM d) IN (0, 6);

    -- D. Count Approved Leaves
    SELECT COALESCE(SUM(
      LEAST(end_date, cycle_end) - GREATEST(start_date, cycle_start) + 1
    ), 0) INTO approved_leave_days
    FROM leave_requests
    WHERE user_id = curr_user_id
      AND status = 'approved'
      AND start_date <= cycle_end
      AND end_date >= cycle_start;

    -- E. LOP Calculation
    paid_leaves_used := LEAST(approved_leave_days, paid_leaves_per_month);
    paid_days := present_days + holiday_count + weekend_count + paid_leaves_used;
    
    IF paid_days > total_days_in_cycle THEN
      paid_days := total_days_in_cycle;
    END IF;

    lop_days := GREATEST(0, total_days_in_cycle - paid_days);
    lop_amount := ROUND((emp_base_salary / 30.0) * lop_days);

    -- F. Tax Calculation
    tax_amount := 0;
    IF tax_enabled THEN
      IF emp_base_salary > tax_slab_3_limit THEN tax_amount := emp_base_salary * 0.15;
      ELSIF emp_base_salary > tax_slab_2_limit THEN tax_amount := emp_base_salary * 0.10;
      ELSIF emp_base_salary > tax_slab_1_limit THEN tax_amount := emp_base_salary * 0.05;
      END IF;
    END IF;

    IF (record_item->>'target_net_salary') IS NOT NULL THEN
      net_salary := (record_item->>'target_net_salary')::NUMERIC;
    ELSE
      net_salary := emp_base_salary - (lop_amount + tax_amount);
    END IF;

    -- H. Build Metadata
    calc_metadata := jsonb_build_object(
      'total_days', total_days_in_cycle,
      'present_days', present_days,
      'holiday_count', holiday_count,
      'weekend_count', weekend_count,
      'leave_days', approved_leave_days,
      'paid_leaves_used', paid_leaves_used,
      'lop_days', lop_days,
      'lop_amount', lop_amount,
      'tax_amount', tax_amount,
      'server_calculated', true,
      'hra_percentage', hra_percentage
    );

    -- Step 4: Supersede existing
    UPDATE payroll
    SET is_current = FALSE, superseded_at = NOW()
    WHERE user_id = curr_user_id
      AND month = target_month
      AND year = target_year
      AND is_current = TRUE;
    
    GET DIAGNOSTICS superseded_count = ROW_COUNT;

    -- Step 5: Insert new record
    INSERT INTO payroll (
      user_id,
      base_salary,
      hra,
      allowances,
      deductions,
      month,
      year,
      metadata,
      version,
      is_current
    ) VALUES (
      curr_user_id,
      emp_base_salary,
      ROUND(emp_base_salary * (hra_percentage / 100.0)),
      GREATEST(0, net_salary - (emp_base_salary + ROUND(emp_base_salary * (hra_percentage / 100.0)) - (lop_amount + tax_amount))),
      lop_amount + tax_amount,
      target_month,
      target_year,
      calc_metadata,
      (SELECT COALESCE(MAX(version), 0) + 1 FROM payroll WHERE user_id = curr_user_id AND month = target_month AND year = target_year),
      TRUE
    );
    
    processed_count := processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed_count', processed_count);
END;
$$;
