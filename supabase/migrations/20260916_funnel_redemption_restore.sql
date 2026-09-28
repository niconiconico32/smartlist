-- =====================================================
-- Funnel restore: RevenueCat redemption, stored server-side
-- Created: 2026-09-16
-- Purpose:
--   1. Persist the web funnel's RevenueCat Redemption URL alongside the
--      plan so the app can discover + redeem it WITHOUT a deep link.
--      Sensitive/operational — kept OUT of plan JSONB, never exposed to
--      anon/authenticated via RLS, never logged, never sent to analytics.
--   2. consume_funnel_redemption() — the ONLY way the app clears a pending
--      redemption after a successful redeem (auth.uid() guard = ownership).
--      This prevents accidental re-use of the same redemption URL.
-- =====================================================

-- ── 1) Column (server-written by the funnel web after purchase/trial) ────────
ALTER TABLE public.web_funnel_plans
  ADD COLUMN IF NOT EXISTS revenuecat_redemption_url TEXT;

COMMENT ON COLUMN public.web_funnel_plans.revenuecat_redemption_url IS
  'RevenueCat Redemption Link for a STRIPE web purchase, written by the funnel web after successful checkout. Sensitive: never returned by any RLS policy, analytics or logs. NULL once consumed by consume_funnel_redemption().';

-- ── 2) Restore lookup index (email + status + recency) ───────────────────────
-- The new restore-funnel-plan finds ONE plan per verified email:
--   status IN (completed, claimed) AND not expired ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_web_funnel_plans_email_status_created
  ON public.web_funnel_plans (email, status, created_at DESC);

-- ── 3) consume_funnel_redemption() — guard: caller owns the plan ─────────────
-- SECURITY DEFINER + auth.uid() guard: a user may only consume the pending
-- redemption of a plan they own (user_id = auth.uid()). Idempotent: a second
-- call on an already-consumed plan returns alreadyConsumed = true.
CREATE OR REPLACE FUNCTION public.consume_funnel_redemption(
  p_plan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan web_funnel_plans%ROWTYPE;
BEGIN
  IF p_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_request');
  END IF;

  -- Row lock so a concurrent redeem cannot double-consume.
  SELECT * INTO v_plan
  FROM public.web_funnel_plans
  WHERE id = p_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Horizontal-escalation guard: only the plan OWNER may consume.
  IF v_plan.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF v_plan.revenuecat_redemption_url IS NULL THEN
    RETURN jsonb_build_object('success', true, 'alreadyConsumed', true);
  END IF;

  UPDATE public.web_funnel_plans
  SET revenuecat_redemption_url = NULL, updated_at = NOW()
  WHERE id = p_plan_id;

  RETURN jsonb_build_object('success', true, 'alreadyConsumed', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_funnel_redemption FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_funnel_redemption TO authenticated;

COMMENT ON FUNCTION public.consume_funnel_redemption IS
  'Marks a plan''s pending RevenueCat redemption as consumed (sets revenuecat_redemption_url = NULL). Only callable by the plan owner (auth.uid() = plan.user_id). Idempotent.';