-- Drop incorrect policies
DROP POLICY IF EXISTS "HR reads all profiles" ON profiles;
DROP POLICY IF EXISTS "HR updates all profiles" ON profiles;

-- Create correct policies
CREATE POLICY "HR reads all profiles"
ON profiles FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

CREATE POLICY "HR updates all profiles"
ON profiles FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');
