-- Create Announcements Table

CREATE TABLE announcements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies

-- Everyone can read active announcements
CREATE POLICY "Everyone reads active announcements"
ON announcements FOR SELECT
TO authenticated
USING (is_active = true OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- Only HR can insert/update/delete
CREATE POLICY "HR manages announcements"
ON announcements FOR ALL
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- Trigger to update timestamp
CREATE TRIGGER trg_update_announcements
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_leave_timestamp(); -- Reusing existing function
