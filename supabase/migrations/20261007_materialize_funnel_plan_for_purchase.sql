-- =====================================================
-- materialize_funnel_plan_for_purchase() — SERVER-SIDE materialization
-- Created: 2026-10-07
--
-- WHY THIS EXISTS
--   `claim_funnel_plan()` is the canonical, atomic, idempotent funnel
--   materialization. Its guard is `p_user_id IS DISTINCT FROM auth.uid()`, and
--   it is granted to `authenticated` only. That is correct for the APP path
--   (finalize-funnel-plan runs with the owner's JWT), but it makes the function
--   unusable from `revenuecat-webhook`, which holds only the service_role key:
--   PostgREST answers `forbidden` because a service_role request carries no
--   user `sub`.
--
--   The funnel therefore used to confirm the purchase and mail the credentials
--   while the plan was still UNMATERIALIZED. The account reached an empty Home
--   with no routines and no tasks, because the only code that ever wrote the
--   content was app-side.
--
-- WHAT THIS DOES
--   It is NOT a second implementation. The body below is generated from the
--   live definition of `claim_funnel_plan` via pg_get_functiondef and only the
--   IDENTITY GUARD is swapped, exactly like 20260921_preserve_purchased_funnel_plans.sql
--   already does. Everything else is byte-identical to the canonical function:
--     * SELECT ... FOR UPDATE row lock on the plan;
--     * pending -> claiming -> claimed state machine;
--     * claimed_by_user_id acquired up front, released by rollback;
--     * tasks -> user_state.activities merged and de-duplicated by id;
--     * routines -> routines + routine_tasks + user_eggs with the same egg
--       conflict resolution (create / reuse-if-free / deterministic fallback /
--       reversible egg_unavailable);
--     * the `__materialized` audit marker, then `claimed` written LAST;
--     * the `already_claimed` / expired / invalid_status answers.
--
--   The new guard is strictly STRONGER for this caller, because service_role
--   cannot prove identity from a JWT:
--     * only `service_role` may execute it at all;
--     * `p_user_id` must equal the plan's persisted `funnel_user_id`
--       (the association the RevenueCat webhook already validated), so a plan
--       can never be materialized into somebody else's account;
--     * `purchase_confirmed_at` must be set, so an unpaid plan never
--       materializes;
--     * a plan already claimed by another account is still refused.
--
-- IDEMPOTENCY / RETRIES
--   A webhook retry after a partial failure converges: `claimed` replays
--   `alreadyClaimed` for the same owner, and a rolled-back attempt leaves the
--   plan `claiming` + owner, which this function accepts for the SAME user.
--
-- IDENTITY ARGUMENTS CHANGE
--   (p_claim_token_hash text, p_user_id uuid, ...) -> (p_plan_id uuid, p_user_id uuid, ...)
--   The app path keeps using `claim_funnel_plan`, which is untouched.
-- =====================================================

DO $$
DECLARE
  v_def TEXT;
  v_original_guard TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'claim_funnel_plan'
      AND pg_get_function_identity_arguments(p.oid) =
          'p_claim_token_hash text, p_user_id uuid, p_activities jsonb, p_routines jsonb'
    LIMIT 1;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'canonical claim_funnel_plan(text, uuid identity) was not found';
  END IF;

  -- Fail loudly instead of emitting a function we do not understand.
  IF position('SECURITY DEFINER' IN upper(v_def)) = 0
     OR position('search_path' IN v_def) = 0
     OR position('FOR UPDATE' IN v_def) = 0
     OR position('__materialized' IN v_def) = 0
     OR position('egg_unavailable' IN v_def) = 0
     OR position('purchase_confirmed_at IS NULL AND' IN v_def) = 0
  THEN
    RAISE EXCEPTION 'claim_funnel_plan definition differs from the expected canonical function';
  END IF;

  v_original_guard :=
    '  IF p_user_id IS DISTINCT FROM auth.uid() THEN' || chr(10) ||
    E'    RETURN jsonb_build_object(''success'', false, ''error'', ''forbidden'');\r\n' || chr(10) ||
    '  END IF;';

  IF position(v_original_guard IN v_def) = 0 THEN
    RAISE EXCEPTION 'could not locate the canonical auth.uid() ownership guard; refusing to guess';
  END IF;

  -- 1) New name and identity: address the plan by id instead of by token hash.
  v_def := replace(v_def, 'claim_funnel_plan', 'materialize_funnel_plan_for_purchase');
  v_def := replace(v_def, 'p_claim_token_hash TEXT', 'p_plan_id UUID');
  v_def := replace(v_def, 'WHERE claim_token_hash = p_claim_token_hash', 'WHERE id = p_plan_id');

  -- 2) Ownership guard: service_role + the plan's own persisted association.
  v_def := replace(v_def, v_original_guard,
    '  -- PURCHASE-SCOPED GUARD: service_role callers cannot prove identity from a' || chr(10) ||
    '  -- JWT, so ownership is re-derived from the plan row itself.' || chr(10) ||
    '  IF auth.role() <> ''service_role'' THEN' || chr(10) ||
    '    RETURN jsonb_build_object(''success'', false, ''error'', ''forbidden'');' || chr(10) ||
    '  END IF;');

  -- 3) Commercial gate: only a confirmed purchase may materialize.
  v_def := replace(v_def,
    '  IF NOT FOUND THEN' || chr(10) ||
    '    RETURN jsonb_build_object(''success'', false, ''error'', ''invalid_token'');' || chr(10) ||
    '  END IF;',
    '  IF NOT FOUND THEN' || chr(10) ||
    '    RETURN jsonb_build_object(''success'', false, ''error'', ''invalid_token'');' || chr(10) ||
    '  END IF;' || chr(10) || chr(10) ||
    '  IF v_plan.funnel_user_id IS DISTINCT FROM p_user_id THEN' || chr(10) ||
    '    RETURN jsonb_build_object(''success'', false, ''error'', ''forbidden'');' || chr(10) ||
    '  END IF;' || chr(10) || chr(10) ||
    '  IF v_plan.purchase_confirmed_at IS NULL THEN' || chr(10) ||
    '    RETURN jsonb_build_object(''success'', false, ''error'', ''purchase_not_confirmed'');' || chr(10) ||
    '  END IF;');

  EXECUTE v_def;

  -- Callable by the webhook and nothing else.
  REVOKE ALL ON FUNCTION public.materialize_funnel_plan_for_purchase(UUID, UUID) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.materialize_funnel_plan_for_purchase(UUID, UUID) TO service_role;
END
$$;

COMMENT ON FUNCTION public.materialize_funnel_plan_for_purchase(UUID, UUID) IS
  'Purchase-scoped entry point built from the canonical claim_funnel_plan body (same lock, state machine, egg resolution, __materialized marker and idempotent replay). Only service_role may call it; it materializes exclusively into the plan''s own funnel_user_id and only after purchase_confirmed_at. Used by revenuecat-webhook so the plan content exists BEFORE onboarding_completed is stamped and BEFORE the credentials email is sent. The app path keeps using claim_funnel_plan with the owner JWT.';