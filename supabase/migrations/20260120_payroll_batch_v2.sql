-- Updated Transactional Payroll Batch Generation Function with Versioning
-- This version supersedes existing records instead of deleting them.

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
  user_ids UUID[];
  prev_version INTEGER;
BEGIN
  -- Extract all user_ids from the incoming records
  SELECT ARRAY_AGG((item->>'user_id')::UUID)
  INTO user_ids
  FROM jsonb_array_elements(payroll_records) AS item;

  -- Step 1: Supersede existing current payroll records for these users
  -- Instead of deleting, we mark them as no longer current
  UPDATE payroll
  SET 
    is_current = FALSE,
    superseded_at = NOW()
  WHERE user_id = ANY(user_ids)
    AND month = target_month
    AND year = target_year
    AND is_current = TRUE;
  
  GET DIAGNOSTICS superseded_count = ROW_COUNT;

  -- Step 2: Insert all new payroll records with incremented versions
  FOR record_item IN SELECT * FROM jsonb_array_elements(payroll_records)
  LOOP
    -- Find the max version for this user/month/year to increment
    SELECT COALESCE(MAX(version), 0) INTO prev_version
    FROM payroll
    WHERE user_id = (record_item->>'user_id')::UUID
      AND month = target_month
      AND year = target_year;

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
      (record_item->>'user_id')::UUID,
      (record_item->>'base_salary')::NUMERIC,
      COALESCE((record_item->>'hra')::NUMERIC, 0),
      COALESCE((record_item->>'allowances')::NUMERIC, 0),
      COALESCE((record_item->>'deductions')::NUMERIC, 0),
      target_month,
      target_year,
      COALESCE(record_item->'metadata', '{}'::JSONB),
      prev_version + 1,
      TRUE
    );
    
    processed_count := processed_count + 1;
  END LOOP;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', processed_count,
    'superseded_count', superseded_count,
    'month', target_month,
    'year', target_year
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will automatically rollback
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'processed_count', 0
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_payroll_batch TO authenticated;

-- Update documentation
COMMENT ON FUNCTION generate_payroll_batch IS 
  'Atomically generates payroll for multiple employees using versioning. Existing current records for the month are superseded (marked is_current=FALSE) rather than deleted.';
