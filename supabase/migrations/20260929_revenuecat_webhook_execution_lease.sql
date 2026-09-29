-- Add execution_id and lease_expires_at to revenuecat_webhook_events
-- for atomic lease-based concurrency control.

ALTER TABLE public.revenuecat_webhook_events
  ADD COLUMN IF NOT EXISTS execution_id TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_lease
  ON public.revenuecat_webhook_events (lease_expires_at)
  WHERE status = 'processing';

COMMENT ON COLUMN public.revenuecat_webhook_events.execution_id IS 'UUID identifying the current execution holding the lease';
COMMENT ON COLUMN public.revenuecat_webhook_events.lease_expires_at IS 'Timestamp when the processing lease expires';
