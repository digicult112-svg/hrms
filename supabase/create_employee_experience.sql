-- Create table for employee work experience
CREATE TABLE IF NOT EXISTS employee_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    role TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE employee_experience ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view their own experience
CREATE POLICY "Users can view own experience" 
ON employee_experience FOR SELECT 
USING (auth.uid() = user_id);

-- 2. HR can view all experience
CREATE POLICY "HR can view all experience" 
ON employee_experience FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'hr'
    )
);

-- 3. Users can insert their own experience
CREATE POLICY "Users can insert own experience" 
ON employee_experience FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Users can update their own experience
CREATE POLICY "Users can update own experience" 
ON employee_experience FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. Users can delete their own experience
CREATE POLICY "Users can delete own experience" 
ON employee_experience FOR DELETE 
USING (auth.uid() = user_id);

-- 6. HR can manage experience (optional, but good for admin)
CREATE POLICY "HR can manage all experience" 
ON employee_experience FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'hr'
    )
);
