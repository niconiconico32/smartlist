-- =====================================================
-- WEB FUNNEL PLANS
-- Created: 2026-05-11
-- Purpose: Store plans generated on the external funnel
-- web and delivered to the app through the deep link
--   brainy://claim?token=<CLAIM_TOKEN>
-- SECURITY: the plaintext token is NEVER stored — only
-- the SHA-256 hex digest (claim_token_hash) is kept.
-- =====================================================

CREATE TABLE IF NOT EXISTS web_funnel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'expired', 'claimed')),
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  email TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  -- Assigned by claim_funnel_plan() when the plan is redeemed.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claim_token_hash TEXT NOT NULL,
  source TEXT,
  campaign TEXT,
  expires_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT web_funnel_plans_claim_token_hash_format
    CHECK (claim_token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT web_funnel_plans_plan_is_object
    CHECK (jsonb_typeof(plan) = 'object')
);

-- At most one plan per token hash.
CREATE UNIQUE INDEX IF NOT EXISTS web_funnel_plans_claim_token_hash_uq
  ON web_funnel_plans(claim_token_hash);

CREATE INDEX IF NOT EXISTS idx_web_funnel_plans_status_created
  ON web_funnel_plans(status, created_at);

CREATE INDEX IF NOT EXISTS idx_web_funnel_plans_user_id
  ON web_funnel_plans(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- -----------------------------------------------------
--   anon (funnel web):        INSERT draft plans only.
--   authenticated (app):      no PostgREST access — the
--                             app redeems plans exclusively
--                             through claim_funnel_plan().
--   service_role:             full access (funnel backend).
-- =====================================================

ALTER TABLE web_funnel_plans ENABLE ROW LEVEL SECURITY;

-- The external funnel web creates DRAFT plans. It can never
-- read or mutate them through PostgREST (no policies -> denied).
DROP POLICY IF EXISTS "Funnel can insert draft plans" ON web_funnel_plans;
CREATE POLICY "Funnel can insert draft plans"
  ON web_funnel_plans FOR INSERT TO anon
  WITH CHECK (status = 'draft');

-- Harden privileges: anon gets INSERT only, app users get nothing.
REVOKE ALL ON web_funnel_plans FROM anon;
GRANT INSERT ON web_funnel_plans TO anon;

REVOKE ALL ON web_funnel_plans FROM authenticated;

-- The claim flow runs under service_role inside an Edge Function.
GRANT SELECT, INSERT, UPDATE, DELETE ON web_funnel_plans TO service_role;

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS set_web_funnel_plans_updated_at ON web_funnel_plans;
CREATE TRIGGER set_web_funnel_plans_updated_at
  BEFORE UPDATE ON web_funnel_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE web_funnel_plans IS
  'Plans built on the external funnel web and claimed in-app via brainy://claim?token=...';

COMMENT ON COLUMN web_funnel_plans.claim_token_hash IS
  'SHA-256 hex digest of the delivery token. The raw token is never persisted.';

COMMENT ON COLUMN web_funnel_plans.status IS
  'State machine: draft -> completed -> claimed (expired is terminal).';

COMMENT ON COLUMN web_funnel_plans.plan IS
  'Funnel payload: { tasks, routines, funnel {...} }. claim_funnel_plan() writes a __materialized marker after redemption for idempotency auditing.';