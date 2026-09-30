-- revenuecat-webhook: execution lease + plan association
--
-- execution_id / lease_expires_at give atomic, expiring exclusion so two
-- deliveries of the same event cannot both run the issuance path.
-- plan_id pins the resolved funnel plan to the event so every retry targets the
-- same plan even if the user creates another plan in the meantime.
--
-- NOT APPLIED: this migration is prepared only.

ALTER TABLE public.revenuecat_webhook_events
  ADD COLUMN IF NOT EXISTS execution_id TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_id UUID;

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_lease
  ON public.revenuecat_webhook_events (lease_expires_at)
  WHERE status = 'processing';

-- Speeds the fallback lookup (plans for one funnel_user_id) and the retry path
-- (events whose issuance is still pending).
CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_plan
  ON public.revenuecat_webhook_events (plan_id)
  WHERE plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_web_funnel_plans_funnel_user_credentials
  ON public.web_funnel_plans (funnel_user_id)
  WHERE credentials_issued_at IS NULL;

COMMENT ON COLUMN public.revenuecat_webhook_events.execution_id IS 'Identifier of the execution currently holding the lease; required to finish or release';
COMMENT ON COLUMN public.revenuecat_webhook_events.lease_expires_at IS 'When the processing lease expires; only an expired lease may be taken over';
COMMENT ON COLUMN public.revenuecat_webhook_events.plan_id IS 'Funnel plan resolved for this event (from event.metadata.brainy_plan_id), pinned so retries stay stable';
