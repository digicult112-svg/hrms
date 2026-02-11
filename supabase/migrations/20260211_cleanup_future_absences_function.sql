-- Function to safely cleanup future unexcused absences
-- This runs with SECURITY DEFINER to bypass RLS if HR doesn't have delete permissions on others' leaves
CREATE OR REPLACE FUNCTION public.cleanup_future_absences()
RETURNS void AS $$
BEGIN
    DELETE FROM public.leave_requests
    WHERE reason = 'Unexcused Absence'
    AND start_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_future_absences TO authenticated;
