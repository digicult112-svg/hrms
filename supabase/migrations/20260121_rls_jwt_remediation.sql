-- Remediation of Critical Audit Findings (Phase 1)
-- 1. JWT-Based RLS Metadata Sync
-- 2. RLS Security Hardening (Frozen Check)
-- 3. Payroll Divisor Fix (Dynamic Days)
-- 4. Job Position Tenant Isolation

-- 1. Metadata Sync Function
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync role and tenant_id to auth.users raw_app_metadata
  -- This allows RLS policies to check the JWT instead of querying profiles (prevents recursion)
  UPDATE auth.users
  SET raw_app_metadata = 
    COALESCE(raw_app_metadata, '{}'::jsonb) || 
    jsonb_build_object(
        'role', NEW.role,
        'tenant_id', NEW.tenant_id,
        'is_frozen', NEW.is_frozen
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for sync
DROP TRIGGER IF EXISTS on_profile_sync ON public.profiles;
CREATE TRIGGER on_profile_sync
AFTER INSERT OR UPDATE OF role, tenant_id, is_frozen ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_auth();

-- Retroactively sync metadata for ALL existing users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.profiles LOOP
        UPDATE auth.users
        SET raw_app_metadata = 
            COALESCE(raw_app_metadata, '{}'::jsonb) || 
            jsonb_build_object(
                'role', r.role,
                'tenant_id', r.tenant_id,
                'is_frozen', r.is_frozen
            )
        WHERE id = r.id;
    END LOOP;
END $$;

-- 2. Optimized JWT Helpers (Non-Recursive)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
  -- Extract from JWT metadata instead of a table lookup
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_hr()
RETURNS BOOLEAN AS $$
  -- Check JWT metadata for 'hr' or 'admin' roles
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') IN ('hr', 'admin');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_account_frozen()
RETURNS BOOLEAN AS $$
  -- Check JWT metadata for frozen status
  SELECT (auth.jwt() -> 'app_metadata' ->> 'is_frozen')::BOOLEAN;
$$ LANGUAGE sql STABLE;

-- 3. Payroll Calculation Refinement (Divisor Fix)
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
  curr_user_id UUID;
  
  -- Settings
  start_day INTEGER;
  end_day INTEGER;
  tax_enabled BOOLEAN;
  paid_leaves_per_month INTEGER;
  hra_percentage NUMERIC;
  
  -- Slabs
  tax_1 NUMERIC; tax_2 NUMERIC; tax_3 NUMERIC;
  
  -- Cycle Dates
  cycle_start DATE;
  cycle_end DATE;
  days_in_cycle INTEGER; -- DYNAMIC DIVISOR
  
  -- Calc Vars
  emp_salary NUMERIC;
  present_days INTEGER;
  holiday_count INTEGER;
  weekend_count INTEGER;
  approved_leaves INTEGER;
  paid_leaves_used INTEGER;
  paid_days INTEGER;
  lop_days NUMERIC;
  lop_amount NUMERIC;
  tax_amount NUMERIC := 0;
  net_salary NUMERIC;
  metadata JSONB;
BEGIN
  -- Security: Role Check (Uses new JWT based check)
  IF NOT is_hr() THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to manage payroll.';
  END IF;

  -- Step 1: Settings
  SELECT value::INTEGER INTO start_day FROM system_settings WHERE key = 'payroll_start_day';
  SELECT value::INTEGER INTO end_day FROM system_settings WHERE key = 'payroll_end_day';
  SELECT value::BOOLEAN INTO tax_enabled FROM system_settings WHERE key = 'payroll_tax_enabled';
  SELECT value::INTEGER INTO paid_leaves_per_month FROM system_settings WHERE key = 'payroll_paid_leaves_per_month';
  SELECT value::NUMERIC INTO hra_percentage FROM system_settings WHERE key = 'payroll_hra_percentage';
  
  SELECT value::NUMERIC INTO tax_1 FROM system_settings WHERE key = 'payroll_tax_slab_1_threshold';
  SELECT value::NUMERIC INTO tax_2 FROM system_settings WHERE key = 'payroll_tax_slab_2_threshold';
  SELECT value::NUMERIC INTO tax_3 FROM system_settings WHERE key = 'payroll_tax_slab_3_threshold';

  -- Step 2: Date Calculation
  cycle_start := (target_year || '-' || target_month || '-' || start_day)::DATE - INTERVAL '1 month';
  cycle_end := (target_year || '-' || target_month || '-' || end_day)::DATE;
  days_in_cycle := (cycle_end - cycle_start) + 1; -- THE DYNAMIC DIVISOR

  FOR record_item IN SELECT * FROM jsonb_array_elements(payroll_records)
  LOOP
    curr_user_id := (record_item->>'user_id')::UUID;
    SELECT amount INTO emp_salary FROM salaries WHERE user_id = curr_user_id;
    CONTINUE WHEN emp_salary IS NULL OR emp_salary = 0;

    -- Stats
    SELECT COUNT(DISTINCT work_date) INTO present_days FROM attendance_logs 
    WHERE user_id = curr_user_id AND work_date BETWEEN cycle_start AND cycle_end AND (mode = 'onsite' OR status = 'approved');

    SELECT COUNT(*) INTO holiday_count FROM leave_calendar_events WHERE event_date BETWEEN cycle_start AND cycle_end;

    WITH date_series AS (SELECT generate_series(cycle_start, cycle_end, '1 day'::interval)::date AS d)
    SELECT COUNT(*) INTO weekend_count FROM date_series WHERE EXTRACT(DOW FROM d) IN (0, 6);

    SELECT COALESCE(SUM(LEAST(end_date, cycle_end) - GREATEST(start_date, cycle_start) + 1), 0) INTO approved_leaves 
    FROM leave_requests WHERE user_id = curr_user_id AND status = 'approved' AND start_date <= cycle_end AND end_date >= cycle_start;

    -- Calculations
    paid_leaves_used := LEAST(approved_leaves, paid_leaves_per_month);
    paid_days := LEAST(days_in_cycle, present_days + holiday_count + weekend_count + paid_leaves_used);
    lop_days := GREATEST(0, days_in_cycle - paid_days);
    
    -- Divisor Fix: Use days_in_cycle instead of 30.0
    lop_amount := ROUND((emp_salary / days_in_cycle::NUMERIC) * lop_days);

    tax_amount := 0;
    IF tax_enabled THEN
      IF emp_salary > tax_3 THEN tax_amount := emp_salary * 0.15;
      ELSIF emp_salary > tax_2 THEN tax_amount := emp_salary * 0.10;
      ELSIF emp_salary > tax_1 THEN tax_amount := emp_salary * 0.05;
      END IF;
    END IF;

    net_salary := emp_salary - (lop_amount + tax_amount);

    -- Metadata
    metadata := jsonb_build_object(
      'divisor', days_in_cycle,
      'lop_days', lop_days,
      'lop_amount', lop_amount,
      'tax_amount', tax_amount,
      'server_calculated', true
    );

    -- Supersede OLD
    UPDATE payroll SET is_current = FALSE, superseded_at = NOW() 
    WHERE user_id = curr_user_id AND month = target_month AND year = target_year AND is_current = TRUE;

    -- Insert NEW
    INSERT INTO payroll (user_id, base_salary, hra, allowances, deductions, month, year, metadata, is_current, version)
    VALUES (
      curr_user_id, 
      emp_salary, 
      ROUND(emp_salary * (hra_percentage / 100.0)),
      0,
      lop_amount + tax_amount,
      target_month,
      target_year,
      metadata,
      TRUE,
      (SELECT COALESCE(MAX(version), 0) + 1 FROM payroll WHERE user_id = curr_user_id AND month = target_month AND year = target_year)
    );
    
    processed_count := processed_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'processed_count', processed_count);
END;
$$;

-- 4. Re-Applying Hardened RLS with Frozen Account Checks and JWT usage
-- Note: We add `AND NOT is_account_frozen()` to all mutation policies.

-- Profiles
DROP POLICY IF EXISTS "Employee reads own profile" ON profiles;
CREATE POLICY "Employee reads own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "HR reads all profiles" ON profiles;
CREATE POLICY "HR reads all profiles" ON profiles FOR SELECT USING (is_hr() AND tenant_id = get_auth_tenant_id());

-- Attendance (Insert blocked if frozen)
DROP POLICY IF EXISTS "Employee inserts attendance" ON attendance_logs;
CREATE POLICY "Employee inserts attendance" ON attendance_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id AND tenant_id = get_auth_tenant_id() AND NOT is_account_frozen());

-- Leave Requests (Blocked if frozen)
DROP POLICY IF EXISTS "Employee submits leave" ON leave_requests;
CREATE POLICY "Employee submits leave" ON leave_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id AND tenant_id = get_auth_tenant_id() AND NOT is_account_frozen());

-- Job Positions (Tenant Isolation)
DROP POLICY IF EXISTS "Public reads job positions" ON job_positions;
CREATE POLICY "Public reads job positions" ON job_positions FOR SELECT 
USING (tenant_id = get_auth_tenant_id() OR get_auth_tenant_id() IS NULL); -- IS NULL covers guests if needed, but scoped to tenant if logged in.

DROP POLICY IF EXISTS "HR manages job positions" ON job_positions;
CREATE POLICY "HR manages job positions" ON job_positions FOR ALL 
USING (is_hr() AND tenant_id = get_auth_tenant_id() AND NOT is_account_frozen());
