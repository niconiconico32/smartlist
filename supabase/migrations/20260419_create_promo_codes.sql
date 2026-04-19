-- ============================================================
-- Promo Codes
-- ============================================================
-- promo_codes: catalog of available codes
-- promo_code_redemptions: per-user usage log (unique per user+code)
-- redeem_promo_code(): atomic RPC — validates + records + returns reward
-- ============================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        UNIQUE NOT NULL,
  reward_coins INTEGER     NOT NULL DEFAULT 2000,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL REFERENCES promo_codes(code) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, user_id)  -- prevents any user from redeeming the same code twice
);

-- RLS: direct table access is denied; all reads/writes go through the RPC
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RPC: redeem_promo_code
--
-- Called by the client with an authenticated session.
-- Returns a JSONB result:
--   { "success": true,  "reward_coins": 2000 }
--   { "success": false, "error": "invalid_code" | "already_used" | "not_authenticated" }
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_promo_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_reward     INTEGER;
BEGIN
  -- Require an authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'not_authenticated');
  END IF;

  -- Normalize: uppercase + strip surrounding whitespace
  p_code := UPPER(TRIM(p_code));

  -- Look up an active code
  SELECT reward_coins INTO v_reward
  FROM promo_codes
  WHERE code = p_code AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_code');
  END IF;

  -- Check per-user usage
  IF EXISTS (
    SELECT 1 FROM promo_code_redemptions
    WHERE code = p_code AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'already_used');
  END IF;

  -- Record the redemption (unique constraint covers race conditions)
  INSERT INTO promo_code_redemptions (code, user_id)
  VALUES (p_code, v_user_id);

  RETURN jsonb_build_object('success', TRUE, 'reward_coins', v_reward);

EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent request beat us to it
    RETURN jsonb_build_object('success', FALSE, 'error', 'already_used');
END;
$$;

-- ============================================================
-- Seed codes (2000 coronas each)
-- ============================================================
INSERT INTO promo_codes (code, reward_coins) VALUES
  ('BRAINY2026',   2000),
  ('LANZAMIENTO',  2000),
  ('BETAUSER',     2000)
ON CONFLICT (code) DO NOTHING;
