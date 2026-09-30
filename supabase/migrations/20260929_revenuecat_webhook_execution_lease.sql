-- revenuecat-webhook: execution lease + immutable purchase→plan association
--
-- execution_id / lease_expires_at give atomic, expiring exclusion so two
-- deliveries of the same event cannot both reach the issuance path.
--
-- revenuecat_purchase_plans binds a RevenueCat purchase to a funnel plan.
-- Scope is (app, store, environment): the same transaction string in another
-- app, store or sandbox is a DIFFERENT purchase and never shares an association.
--
-- NOT APPLIED: prepared only.

-- ── 1. Lease columns on the event store ─────────────────────────────────────
ALTER TABLE public.revenuecat_webhook_events
  ADD COLUMN IF NOT EXISTS execution_id TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_lease
  ON public.revenuecat_webhook_events (lease_expires_at)
  WHERE status = 'processing';

-- ── 2. Purchase → plan association ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.revenuecat_purchase_plans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key               TEXT NOT NULL,
  transaction_id          TEXT NOT NULL,
  original_transaction_id TEXT,
  app_user_id             UUID NOT NULL,
  plan_id                 UUID NOT NULL REFERENCES public.web_funnel_plans(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A purchase can be bound to exactly ONE plan, per scope. This is the
  -- constraint that makes a second, conflicting declaration fail at the DB.
  CONSTRAINT revenuecat_purchase_plans_scope_tx_uniq UNIQUE (scope_key, transaction_id)
);

-- SECOND half of the contract: a renewal (its own transaction_id) must always
-- resolve back to the SAME plan as the purchase it descends from. Without this
-- index a renewal could be associated to a different plan than its origin.
CREATE UNIQUE INDEX IF NOT EXISTS revenuecat_purchase_plans_scope_orig_uniq
  ON public.revenuecat_purchase_plans (scope_key, original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenuecat_purchase_plans_user
  ON public.revenuecat_purchase_plans (app_user_id);

-- ── 3. plan_id is immutable ──────────────────────────────────────────────────
-- UNIQUE alone stops a second row, but an UPDATE could still silently move a
-- purchase to another plan. This trigger refuses that outright.
CREATE OR REPLACE FUNCTION public.revenuecat_purchase_plans_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
    RAISE EXCEPTION 'revenuecat_purchase_plans.plan_id is immutable (purchase % already bound to plan %)',
      OLD.transaction_id, OLD.plan_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS revenuecat_purchase_plans_immutable_trg ON public.revenuecat_purchase_plans;
CREATE TRIGGER revenuecat_purchase_plans_immutable_trg
  BEFORE UPDATE ON public.revenuecat_purchase_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.revenuecat_purchase_plans_immutable();

-- ── 4. RLS: only the service role (Edge Function) touches this table ─────────
ALTER TABLE public.revenuecat_purchase_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.revenuecat_purchase_plans FROM anon, authenticated;
GRANT SELECT, INSERT ON public.revenuecat_purchase_plans TO service_role;
-- No UPDATE/DELETE: reassignment is impossible even for a compromised caller.

COMMENT ON TABLE public.revenuecat_purchase_plans IS
  'Immutable binding between a RevenueCat purchase (scope: app|store|environment + transaction_id) and the funnel plan it created.';
COMMENT ON COLUMN public.revenuecat_purchase_plans.scope_key IS
  'app_id|store|environment — the boundary within which a transaction_id identifies a purchase.';
COMMENT ON COLUMN public.revenuecat_purchase_plans.transaction_id IS
  'RevenueCat transaction_id of THIS purchase. Unique per scope.';
COMMENT ON COLUMN public.revenuecat_purchase_plans.original_transaction_id IS
  'RevenueCat original_transaction_id: the purchase a renewal descends from. Used to resolve, never to create.';
COMMENT ON COLUMN public.revenuecat_purchase_plans.plan_id IS
  'Immutable funnel plan bound to this purchase. UPDATE is rejected by trigger.';
