-- Brainy Web-to-App v4, Part 1: identified funnel account and credential delivery.
-- No plaintext passwords, claim tokens, or provider secrets are persisted.

ALTER TABLE public.web_funnel_plans
  ADD COLUMN IF NOT EXISTS funnel_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_created_by_funnel BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS purchase_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credentials_issuing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credentials_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credentials_email_id TEXT,
  ADD COLUMN IF NOT EXISTS credentials_email_status TEXT;

CREATE INDEX IF NOT EXISTS idx_web_funnel_plans_funnel_user_id
  ON public.web_funnel_plans(funnel_user_id);
CREATE INDEX IF NOT EXISTS idx_web_funnel_plans_purchase_confirmed_at
  ON public.web_funnel_plans(purchase_confirmed_at);

CREATE TABLE IF NOT EXISTS public.revenuecat_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  app_user_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL
    CHECK (status IN ('processing', 'processed', 'ignored', 'retryable'))
);

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_status
  ON public.revenuecat_webhook_events(status);

ALTER TABLE public.revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.revenuecat_webhook_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.revenuecat_webhook_events TO service_role;

COMMENT ON COLUMN public.web_funnel_plans.funnel_user_id IS
  'Supabase Auth identity assigned before checkout; canonical RevenueCat app_user_id.';
COMMENT ON COLUMN public.web_funnel_plans.claimed_by_user_id IS
  'Identity that eventually materializes/claims the plan; distinct from funnel_user_id.';
COMMENT ON COLUMN public.web_funnel_plans.credentials_issuing_started_at IS
  'Short credential issuance lease; stale after two minutes and never contains a secret.';
COMMENT ON TABLE public.revenuecat_webhook_events IS
  'Minimal RevenueCat event idempotency store; intentionally excludes complete payloads.';
