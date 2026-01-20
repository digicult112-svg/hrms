-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    link TEXT, -- Optional link to navigate to
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Users can see their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true); -- Usually inserted via service_role or triggers

-- Function to notify HR on specific events
CREATE OR REPLACE FUNCTION public.notify_hr_on_event()
RETURNS TRIGGER AS $$
DECLARE
    hr_user RECORD;
BEGIN
    FOR hr_user IN SELECT id FROM public.profiles WHERE role = 'hr' AND deleted_at IS NULL LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            hr_user.id,
            CASE 
                WHEN TG_TABLE_NAME = 'leave_requests' THEN 'New Leave Request'
                WHEN TG_TABLE_NAME = 'tickets' THEN 'New Support Ticket'
                ELSE 'System Notification'
            END,
            CASE
                WHEN TG_TABLE_NAME = 'leave_requests' THEN 'New leave request from ' || (SELECT full_name FROM public.profiles WHERE id = NEW.user_id)
                WHEN TG_TABLE_NAME = 'tickets' THEN 'New ticket: ' || NEW.subject || ' from ' || (SELECT full_name FROM public.profiles WHERE id = NEW.employee_id)
                ELSE 'Activity in ' || TG_TABLE_NAME
            END,
            'info'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for HR notifications
DROP TRIGGER IF EXISTS tr_notify_hr_leave ON public.leave_requests;
CREATE TRIGGER tr_notify_hr_leave
    AFTER INSERT ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_hr_on_event();

DROP TRIGGER IF EXISTS tr_notify_hr_ticket ON public.tickets;
CREATE TRIGGER tr_notify_hr_ticket
    AFTER INSERT ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.notify_hr_on_event();

-- Function to notify user on status changes
CREATE OR REPLACE FUNCTION public.notify_user_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'leave_requests' AND NEW.status != OLD.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Leave Request ' || NEW.status,
            'Your leave request from ' || NEW.start_date || ' has been ' || lower(NEW.status),
            CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END
        );
    END IF;

    IF (TG_TABLE_NAME = 'tickets' AND NEW.status != OLD.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.employee_id,
            'Ticket Status Update',
            'Your ticket "' || NEW.subject || '" is now ' || lower(NEW.status),
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for User notifications
DROP TRIGGER IF EXISTS tr_notify_user_leave_status ON public.leave_requests;
CREATE TRIGGER tr_notify_user_leave_status
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.notify_user_on_status_change();

DROP TRIGGER IF EXISTS tr_notify_user_ticket_status ON public.tickets;
CREATE TRIGGER tr_notify_user_ticket_status
    AFTER UPDATE ON public.tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.notify_user_on_status_change();
