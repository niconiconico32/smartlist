-- ============================================================
-- User Push Tokens
-- ============================================================
-- Stores Expo push tokens per user so we can send push
-- notifications from Edge Functions.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- RLS: users can only manage their own push token
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own push token"
  ON user_push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push token"
  ON user_push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own push token"
  ON user_push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- For service_role (Edge Functions) to read all push tokens
CREATE POLICY "Service role can read all push tokens"
  ON user_push_tokens
  FOR SELECT
  TO service_role
  USING (TRUE);
