-- Trigger to automatically create a leave request when a WFH attendance log is rejected

CREATE OR REPLACE FUNCTION handle_wfh_rejection()
RETURNS trigger AS $$
BEGIN
    -- Check if the status changed to 'rejected' and it was a 'wfh' request
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' AND NEW.mode = 'wfh' THEN
        INSERT INTO leave_requests (
            user_id,
            start_date,
            end_date,
            reason,
            status,
            hr_comment
        )
        VALUES (
            NEW.user_id,
            NEW.work_date,
            NEW.work_date,
            'WFH Request Rejected: ' || COALESCE(NEW.wfh_reason, 'No reason provided'),
            'approved', -- Automatically approve the "leave" (absence) so it's recorded
            'System: Automatically created from rejected WFH request.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wfh_rejection ON attendance_logs;

CREATE TRIGGER trg_wfh_rejection
AFTER UPDATE ON attendance_logs
FOR EACH ROW
EXECUTE FUNCTION handle_wfh_rejection();
