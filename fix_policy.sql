DROP POLICY IF EXISTS "Users can update own routines" ON routines;

CREATE POLICY "Users can update own routines"
  ON routines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
