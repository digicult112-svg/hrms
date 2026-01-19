-- Transactional Payroll Batch Generation Function
-- This function processes all payroll records within a single database transaction.
-- If any operation fails, the entire batch is rolled back.

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
  deleted_count INTEGER := 0;
  user_ids UUID[];
BEGIN
  -- Extract all user_ids from the incoming records
  SELECT ARRAY_AGG((item->>'user_id')::UUID)
  INTO user_ids
  FROM jsonb_array_elements(payroll_records) AS item;

  -- Step 1: Delete all existing payroll records for these users in the target month/year
  DELETE FROM payroll
  WHERE user_id = ANY(user_ids)
    AND month = target_month
    AND year = target_year;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Step 2: Insert all new payroll records
  FOR record_item IN SELECT * FROM jsonb_array_elements(payroll_records)
  LOOP
    INSERT INTO payroll (
      user_id,
      base_salary,
      hra,
      allowances,
      deductions,
      month,
      year,
      metadata
    ) VALUES (
      (record_item->>'user_id')::UUID,
      (record_item->>'base_salary')::NUMERIC,
      COALESCE((record_item->>'hra')::NUMERIC, 0),
      COALESCE((record_item->>'allowances')::NUMERIC, 0),
      COALESCE((record_item->>'deductions')::NUMERIC, 0),
      target_month,
      target_year,
      COALESCE(record_item->'metadata', '{}'::JSONB)
    );
    
    processed_count := processed_count + 1;
  END LOOP;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', processed_count,
    'deleted_count', deleted_count,
    'month', target_month,
    'year', target_year
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will automatically rollback
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'processed_count', 0
    );
END;
$$;

-- Grant execute permission to authenticated users (adjust based on your RLS needs)
GRANT EXECUTE ON FUNCTION generate_payroll_batch TO authenticated;

-- Add a comment for documentation
COMMENT ON FUNCTION generate_payroll_batch IS 
  'Atomically generates payroll for multiple employees. All records are processed within a single transaction - either all succeed or all rollback.';
