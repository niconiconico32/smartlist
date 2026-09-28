-- =====================================================
-- USER EGGS (CLOUD PERSISTENCE LAYER)
-- Created: 2026-05-13
-- Purpose: Cloud source of truth for the egg store. The
-- app keeps its fast local store (zustand + AsyncStorage)
-- and hydrates/pushes through this table, mirroring the
-- user_state pattern.
-- =====================================================

CREATE TABLE IF NOT EXISTS user_eggs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  egg_id INTEGER NOT NULL REFERENCES egg_catalog(id) ON DELETE CASCADE,
  -- Set when the egg is linked to a routine. Cleared if the
  -- routine is deleted (egg survives, progress preserved).
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp BETWEEN 0 AND 3),
  evolved BOOLEAN NOT NULL DEFAULT FALSE,
  pet_xp INTEGER NOT NULL DEFAULT 0 CHECK (pet_xp >= 0),
  pet_level INTEGER NOT NULL DEFAULT 0 CHECK (pet_level >= 0),
  last_xp_date DATE,
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_eggs_unique_user_egg UNIQUE (user_id, egg_id)
);

CREATE INDEX IF NOT EXISTS idx_user_eggs_user_id ON user_eggs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_eggs_routine_id ON user_eggs(routine_id);
CREATE INDEX IF NOT EXISTS idx_user_eggs_user_egg ON user_eggs(user_id, egg_id);

-- =====================================================
-- ROW LEVEL SECURITY (BY OWNER)
-- =====================================================

ALTER TABLE user_eggs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own eggs" ON user_eggs;
CREATE POLICY "Users can view own eggs"
  ON user_eggs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own eggs" ON user_eggs;
CREATE POLICY "Users can insert own eggs"
  ON user_eggs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own eggs" ON user_eggs;
CREATE POLICY "Users can update own eggs"
  ON user_eggs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own eggs" ON user_eggs;
CREATE POLICY "Users can delete own eggs"
  ON user_eggs FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS set_user_eggs_updated_at ON user_eggs;
CREATE TRIGGER set_user_eggs_updated_at
  BEFORE UPDATE ON user_eggs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_eggs IS 'Cloud persistence layer for the local egg store (useEggStore)';
COMMENT ON COLUMN user_eggs.xp IS 'Hatching XP before evolution (0-3). Post-evolution XP lives in pet_xp.';
COMMENT ON COLUMN user_eggs.last_xp_date IS 'Last day XP was awarded, preventing same-day double-counting.';
COMMENT ON COLUMN user_eggs.routine_id IS 'Routine the egg is linked to; NULLed when the routine is deleted.';