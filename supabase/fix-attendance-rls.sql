-- Enable RLS on attendance_logs
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own logs
DROP POLICY IF EXISTS "Users can read own attendance" ON public.attendance_logs;
CREATE POLICY "Users can read own attendance"
ON public.attendance_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own logs
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_logs;
CREATE POLICY "Users can insert own attendance"
ON public.attendance_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own logs (for clock out, pause, resume)
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_logs;
CREATE POLICY "Users can update own attendance"
ON public.attendance_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow HR to view all logs (optional, but good for admin view)
DROP POLICY IF EXISTS "HR can view all attendance" ON public.attendance_logs;
CREATE POLICY "HR can view all attendance"
ON public.attendance_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'hr'
  )
);
