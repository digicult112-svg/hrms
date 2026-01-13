-- 1. Add daily_work_hours to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_work_hours') THEN
        ALTER TABLE profiles ADD COLUMN daily_work_hours integer DEFAULT 8;
    END IF;
END $$;

-- 2. Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text
);

-- 3. Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for system_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Read system settings') THEN
        CREATE POLICY "Read system settings" ON system_settings FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'HR manage system settings') THEN
        CREATE POLICY "HR manage system settings" ON system_settings FOR ALL TO authenticated
        USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
        WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
    END IF;
END $$;

-- 5. Insert default work hours setting
INSERT INTO system_settings (key, value, description)
VALUES ('default_work_hours', '8'::jsonb, 'Default daily work hours for employees')
ON CONFLICT (key) DO NOTHING;

-- 6. Force schema cache reload
NOTIFY pgrst, 'reload schema';
