-- Enterprise readiness: Period Locking & Optimistic Concurrency
-- Part of Phase 8: Hardening

-- 1. Create Payroll Periods Table
CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, month, year)
);

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR manages periods" ON public.payroll_periods FOR ALL 
USING (is_hr() AND tenant_id = get_auth_tenant_id());

-- 2. Period Locking Trigger Function
CREATE OR REPLACE FUNCTION public.check_if_period_locked()
RETURNS TRIGGER AS $$
DECLARE
    v_month INTEGER;
    v_year INTEGER;
    v_is_locked BOOLEAN;
    v_row RECORD;
BEGIN
    -- Use NEW in INSERT/UPDATE, and OLD in DELETE
    v_row := COALESCE(NEW, OLD);

    -- Determine month/year from the row being mutated
    IF TG_TABLE_NAME = 'attendance_logs' THEN
        v_month := EXTRACT(MONTH FROM v_row.work_date);
        v_year := EXTRACT(YEAR FROM v_row.work_date);
    ELSIF TG_TABLE_NAME = 'payroll' THEN
        v_month := v_row.month;
        v_year := v_row.year;
    ELSIF TG_TABLE_NAME = 'leave_requests' THEN
        -- Check if either the start month or the end month of the leave is locked
        IF EXISTS (
            SELECT 1 FROM public.payroll_periods 
            WHERE tenant_id = v_row.tenant_id AND is_locked = TRUE 
            AND (
                (month = EXTRACT(MONTH FROM v_row.start_date) AND year = EXTRACT(YEAR FROM v_row.start_date))
                OR 
                (month = EXTRACT(MONTH FROM v_row.end_date) AND year = EXTRACT(YEAR FROM v_row.end_date))
            )
        ) THEN
            RAISE EXCEPTION 'Restricted Action: The leave request spans a locked payroll period. No further modifications are allowed.';
        END IF;
        RETURN v_row;
    END IF;

    -- Check if that period is locked for this tenant
    SELECT is_locked INTO v_is_locked 
    FROM public.payroll_periods 
    WHERE tenant_id = v_row.tenant_id AND month = v_month AND year = v_year;

    IF v_is_locked = TRUE THEN
        RAISE EXCEPTION 'Restricted Action: The payroll period for %/% is locked. No further modifications are allowed.', v_month, v_year;
    END IF;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply Lock Triggers to Critical Tables
CREATE TRIGGER trg_lock_attendance
BEFORE INSERT OR UPDATE OR DELETE ON public.attendance_logs
FOR EACH ROW EXECUTE FUNCTION check_if_period_locked();

CREATE TRIGGER trg_lock_payroll
BEFORE INSERT OR UPDATE OR DELETE ON public.payroll
FOR EACH ROW EXECUTE FUNCTION check_if_period_locked();

CREATE TRIGGER trg_lock_leaves
BEFORE INSERT OR UPDATE OR DELETE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION check_if_period_locked();

-- 4. Optimistic Locking Foundation
-- Add version column to profiles and leave_requests
ALTER TABLE public.profiles ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE public.leave_requests ADD COLUMN version INTEGER DEFAULT 1;

-- Function to handle version increments
CREATE OR REPLACE FUNCTION public.increment_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version IS NULL OR NEW.version != OLD.version THEN
        RAISE EXCEPTION 'Concurrency Violation: The record has been modified by another user. Please refresh and try again.';
    END IF;
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to leave requests (critical for concurrent HR approvals)
CREATE TRIGGER trg_version_leaves
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW 
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.hr_comment IS DISTINCT FROM NEW.hr_comment)
EXECUTE FUNCTION increment_version();
