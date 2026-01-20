-- Updated Transactional Payroll Batch Generation Function with Server-Side Calculations
-- This version handles LOP, Tax, and attendance-based logic internally to prevent client-side manipulation.

CREATE OR REPLACE FUNCTION generate_payroll_batch(
  payroll_records JSONB, -- Array of objects containing {user_id} only (others ignored/recalculated)
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
  curr_tenant_id UUID;
  auth_tenant_id UUID;
  
  -- Settings
  start_day INTEGER := 26;
  end_day INTEGER := 25;
  tax_enabled BOOLEAN := TRUE;
  paid_leaves_per_month INTEGER := 1;
  
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
  attendance_snap JSONB;
BEGIN
  -- 🔒 SECURITY CHECK: Only HR or Admins can generate payroll
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to generate payroll.';
  END IF;

  -- 🔒 TENANT ISOLATION: Get the HR's tenant ID
  SELECT tenant_id INTO auth_tenant_id FROM public.profiles WHERE id = auth.uid();
  IF auth_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Configuration Error: Actor has no tenant_id assigned.';
  END IF;

  -- Step 1: Fetch System Settings
  SELECT COALESCE((SELECT value::INTEGER FROM system_settings WHERE key = 'payroll_start_day'), 26) INTO start_day;
  SELECT COALESCE((SELECT value::INTEGER FROM system_settings WHERE key = 'payroll_end_day'), 25) INTO end_day;
  SELECT COALESCE((SELECT value::BOOLEAN FROM system_settings WHERE key = 'payroll_tax_enabled'), TRUE) INTO tax_enabled;
  SELECT COALESCE((SELECT value::INTEGER FROM system_settings WHERE key = 'payroll_paid_leaves_per_month'), 1) INTO paid_leaves_per_month;

  -- Step 2: Calculate Cycle Range
  -- Logical Month N usually starts on Day X of Month N-1 and ends on Day Y of Month N
  cycle_start := (target_year || '-' || target_month || '-' || start_day)::DATE - INTERVAL '1 month';
  cycle_end := (target_year || '-' || target_month || '-' || end_day)::DATE;
  total_days_in_cycle := (cycle_end - cycle_start) + 1;

  -- Step 3: Iterate through records
  FOR record_item IN SELECT * FROM jsonb_array_elements(payroll_records)
  LOOP
    curr_user_id := (record_item->>'user_id')::UUID;

    -- Fetch Employee Base Salary and Validate Tenant
    SELECT salary, tenant_id INTO emp_base_salary, curr_tenant_id 
    FROM profiles WHERE id = curr_user_id;

    IF curr_tenant_id IS NULL OR curr_tenant_id != auth_tenant_id THEN
      RAISE EXCEPTION 'Security Violation: Cannot process employee % outside of your tenant.', curr_user_id;
    END IF;

    CONTINUE WHEN emp_base_salary IS NULL OR emp_base_salary = 0;

    -- A. Count Present Days and Capture Snapshot
    SELECT 
      COUNT(DISTINCT work_date),
      jsonb_agg(jsonb_build_object(
        'work_date', work_date,
        'mode', mode,
        'clock_in', clock_in,
        'clock_out', clock_out,
        'total_hours', total_hours
      ))
    INTO present_days, attendance_snap
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
    WHERE EXTRACT(DOW FROM d) IN (0, 6); -- 0=Sunday, 6=Saturday

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
    
    -- Cap paid days at total cycle days
    IF paid_days > total_days_in_cycle THEN
      paid_days := total_days_in_cycle;
    END IF;

    lop_days := GREATEST(0, total_days_in_cycle - paid_days);
    lop_amount := ROUND((emp_base_salary / total_days_in_cycle::NUMERIC) * lop_days);

    -- F. Tax Calculation
    tax_amount := 0;
    IF tax_enabled THEN
      IF emp_base_salary > 100000 THEN tax_amount := emp_base_salary * 0.15;
      ELSIF emp_base_salary > 50000 THEN tax_amount := emp_base_salary * 0.10;
      ELSIF emp_base_salary > 25000 THEN tax_amount := emp_base_salary * 0.05;
      END IF;
    END IF;

    -- G. Adjustment / Target Salary Support
    -- Calculate actual days in the target month/year for accurate PRORATA
    -- net = (base + allowances) - (lop + tax)
    -- allowances = net - base + lop + tax
    IF (record_item->>'target_net_salary') IS NOT NULL THEN
      net_salary := (record_item->>'target_net_salary')::NUMERIC;
      lop_amount := ROUND((net_salary / total_days_in_cycle::NUMERIC) * lop_days); 
      lop_amount := ROUND((emp_base_salary / total_days_in_cycle::NUMERIC) * lop_days); 
      
      -- Recalculate allowances to meet target
      net_salary := (record_item->>'target_net_salary')::NUMERIC;
    ELSE
      lop_amount := ROUND((emp_base_salary / total_days_in_cycle::NUMERIC) * lop_days);
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
      'server_calculated', true
    );

    -- Step 4: Supersede existing current payroll for this user
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
      attendance_snapshot,
      version,
      is_current
    ) VALUES (
      curr_user_id,
      emp_base_salary,
      ROUND(emp_base_salary * 0.4), -- Standard 40% HRA
      GREATEST(0, net_salary - (emp_base_salary + ROUND(emp_base_salary * 0.4) - (lop_amount + tax_amount))), -- Allowances needed to hit net
      lop_amount + tax_amount,
      target_month,
      target_year,
      calc_metadata,
      attendance_snap,
      (SELECT COALESCE(MAX(version), 0) + 1 FROM payroll WHERE user_id = curr_user_id AND month = target_month AND year = target_year),
      TRUE
    );
    
    processed_count := processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', processed_count,
    'month', target_month,
    'year', target_year
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_payroll_batch TO authenticated;

-- Update documentation
COMMENT ON FUNCTION generate_payroll_batch IS 
  'Atomically generates payroll for multiple employees using versioning. Existing current records for the month are superseded (marked is_current=FALSE) rather than deleted.';
