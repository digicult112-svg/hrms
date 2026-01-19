-- Create anonymous_messages table
CREATE TABLE IF NOT EXISTS anonymous_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE anonymous_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can insert (send messages)
CREATE POLICY "Anyone can send anonymous messages"
  ON anonymous_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only Admins can view
-- Note: This relies on a recursive check or a helper function to avoid infinite recursion if checking the same table.
-- Since we check 'profiles' table for role, it's safe.
CREATE POLICY "Only admins can view anonymous messages"
  ON anonymous_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
