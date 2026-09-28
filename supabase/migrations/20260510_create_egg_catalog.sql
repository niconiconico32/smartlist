-- =====================================================
-- EGG CATALOG (FORMALIZED)
-- Created: 2026-05-10
-- Purpose: Formalize `egg_catalog`, which was previously
-- only created manually in production. The app consumes
-- it through src/hooks/useEggCatalog.ts with:
--   id, name, rarity, cost, egg_image_url, pet_image_url,
--   active, sort_order
-- Deploying this migration is REQUIRED before user_eggs
-- (20260513) can reference egg_catalog as a foreign key.
-- =====================================================

CREATE TABLE IF NOT EXISTS egg_catalog (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'legendary')),
  cost INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  egg_image_url TEXT,
  pet_image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_catalog_active_sort ON egg_catalog(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_egg_catalog_rarity ON egg_catalog(rarity);

-- =====================================================
-- ROW LEVEL SECURITY
-- -----------------------------------------------------
-- Public read-only catalog: the app reads it with the
-- anon key. Nobody writes to it directly from the client
-- (assets are managed via SQL / dashboard).
-- =====================================================

ALTER TABLE egg_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Egg catalog is publicly readable" ON egg_catalog;
CREATE POLICY "Egg catalog is publicly readable"
  ON egg_catalog FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================
-- BASE SEED (ids 1-18)
-- -----------------------------------------------------
-- Matches the bundled EGG_METADATA catalog. ON CONFLICT
-- DO NOTHING keeps production rows that already carry
-- remote image URLs untouched.
-- =====================================================

INSERT INTO egg_catalog (id, name, rarity, cost, sort_order, active) VALUES
  (1,  'Terra Egg',   'common',    0,    10,  true),
  (2,  'Aqua Egg',    'common',    0,    20,  true),
  (3,  'Flame Egg',   'common',    0,    30,  true),
  (4,  'Storm Egg',   'common',    0,    40,  true),
  (5,  'Leaf Egg',    'common',    0,    50,  true),
  (6,  'Stone Egg',   'common',    0,    60,  true),
  (7,  'Crystal Egg', 'common',    0,    70,  true),
  (8,  'Shadow Egg',  'common',    0,    80,  true),
  (9,  'Frost Egg',   'rare',      1500, 90,  true),
  (10, 'Ember Egg',   'rare',      1500, 100, true),
  (11, 'Tide Egg',    'rare',      1500, 110, true),
  (12, 'Tempest Egg', 'rare',      1500, 120, true),
  (13, 'Bloom Egg',   'rare',      1500, 130, true),
  (14, 'Dragon Egg',  'rare',      5000, 140, true),
  (15, 'Phoenix Egg', 'legendary', 5000, 150, true),
  (16, 'Cosmos Egg',  'legendary', 5000, 160, true),
  (17, 'Snow Egg',    'legendary', 5000, 170, true),
  (18, 'Void Egg',    'legendary', 5000, 180, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS set_egg_catalog_updated_at ON egg_catalog;
CREATE TRIGGER set_egg_catalog_updated_at
  BEFORE UPDATE ON egg_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE egg_catalog IS 'Egg/pet catalog consumed by the app via src/hooks/useEggCatalog.ts';
COMMENT ON COLUMN egg_catalog.id IS 'Numeric egg id (1-18 bundled). Ids 19+ are remote-only entries.';
COMMENT ON COLUMN egg_catalog.rarity IS 'Rarity tier: common, rare, legendary.';
COMMENT ON COLUMN egg_catalog.egg_image_url IS 'Remote egg sprite URL (null = use bundled asset).';
COMMENT ON COLUMN egg_catalog.pet_image_url IS 'Remote evolved pet sprite URL (null = use bundled asset).';