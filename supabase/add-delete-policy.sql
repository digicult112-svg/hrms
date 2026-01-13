-- Allow HR to delete profiles
-- This is needed because we are deleting profiles from the frontend
-- instead of deleting auth users (which requires service role key)

CREATE POLICY "HR deletes profiles"
ON profiles FOR DELETE
TO authenticated
USING (role = 'hr');
