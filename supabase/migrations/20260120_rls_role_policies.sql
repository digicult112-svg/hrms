-- Comprehensive RLS Policies for HRMS security

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "HR/Admins can do everything with profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  )
);

-- 2. PAYROLL
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payroll" 
ON public.payroll FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "HR/Admins can view all payroll" 
ON public.payroll FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  )
);

CREATE POLICY "HR/Admins can manage payroll" 
ON public.payroll FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  )
);

-- 3. LEAVE REQUESTS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leaves" 
ON public.leave_requests FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "HR/Admins can view all leaves" 
ON public.leave_requests FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  )
);

CREATE POLICY "Users can insert own leaves" 
ON public.leave_requests FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending leaves" 
ON public.leave_requests FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "HR/Admins can manage all leaves" 
ON public.leave_requests FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  )
);

-- 4. ATTENDANCE LOGS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance" 
ON public.attendance_logs FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "HR/Admins can view all attendance" 
ON public.attendance_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  )
);

CREATE POLICY "Users can log own attendance" 
ON public.attendance_logs FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "HR/Admins can manage attendance" 
ON public.attendance_logs FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  )
);
