-- Fix UPDATE policy for routines table
-- The original policy was missing WITH CHECK clause

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own routines" ON routines;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Users can update own routines"
  ON routines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
