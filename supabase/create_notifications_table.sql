-- Create a table for system notifications
CREATE TABLE IF NOT EXISTS public.pending_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, error, success
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.pending_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.pending_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark read)"
  ON public.pending_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- HR or System can insert
CREATE POLICY "Admins can insert notifications"
  ON public.pending_notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
    OR
    -- Allow self-insert for system triggers if needed, currently restricted to HR/Admin or server-side keys usually
    -- For client-side 'system' logic running as user, we might need:
    auth.uid() = user_id
  );
