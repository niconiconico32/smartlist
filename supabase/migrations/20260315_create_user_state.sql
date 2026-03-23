-- =====================================================
-- SMARTLIST USER STATE UNIFIED SCHEMA (JSONB MIGRATION)
-- Created: 2026-03-15
-- Purpose: Seamlessly store the entire AsyncStorage "activities" 
-- payload into Supabase without rewriting the Home screen logic.
-- =====================================================

CREATE TABLE IF NOT EXISTS user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  activities JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

-- Users can view their own state
CREATE POLICY "Users can view own state"
  ON user_state FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own state
CREATE POLICY "Users can insert own state"
  ON user_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own state
CREATE POLICY "Users can update own state"
  ON user_state FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_state_updated_at
  BEFORE UPDATE ON user_state
  FOR EACH ROW
  EXECUTE FUNCTION update_user_state_updated_at();

COMMENT ON TABLE user_state IS 'Stores unified JSON blobs like Activities array synced from local AsyncStorage.';
