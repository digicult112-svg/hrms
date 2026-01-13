-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Read system settings" ON system_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR manage system settings" ON system_settings
    FOR ALL TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- Insert default work hours
INSERT INTO system_settings (key, value, description)
VALUES ('default_work_hours', '8'::jsonb, 'Default daily work hours for employees')
ON CONFLICT (key) DO NOTHING;
