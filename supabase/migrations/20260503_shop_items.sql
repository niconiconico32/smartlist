CREATE TABLE shop_items (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  price       INTEGER NOT NULL,
  is_pro      BOOLEAN DEFAULT false,
  type        TEXT    CHECK (type IN ('background', 'outfit')),
  image_url   TEXT,       -- null = usar asset bundleado, URL = imagen remota en Storage
  sort_order  INTEGER DEFAULT 999,
  active      BOOLEAN DEFAULT true
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON shop_items
  FOR SELECT
  TO public
  USING (true);
