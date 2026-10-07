-- =====================================================
-- materialize_funnel_plan_for_purchase() — SERVER-SIDE materialization
-- Created: 2026-10-07
--
-- WHY THIS EXISTS
--   `claim_funnel_plan()` is the canonical, atomic, idempotent funnel
--   materialization. Its guard is `p_user_id IS DISTINCT FROM auth.uid()`, and
--   it is granted to `authenticated` (plus service_role via default
--   privileges). That is correct for the APP path (finalize-funnel-plan runs
--   with the owner's JWT), but it makes the function unusable from
--   `revenuecat-webhook`: PostgREST answers `forbidden` because a service_role
--   request carries no user `sub`.
--
--   Verified against production before writing this file:
--       select public.claim_funnel_plan('<bogus>', <uuid>, '[]', '[]');
--       => {"success":false,"error":"forbidden"}
--
--   So the funnel confirmed the purchase and mailed the credentials while the
--   plan was still UNMATERIALIZED. The account reached an empty Home with no
--   routines and no tasks, because the only code that ever wrote the content
--   was app-side.
--
-- WHAT THIS DOES — it is NOT a second implementation
--   The body below is GENERATED from the live definition of
--   `claim_funnel_plan` via pg_get_functiondef, and only the identity guard is
--   swapped. This is the same technique the project already uses in
--   20260921_preserve_purchased_funnel_plans.sql. Everything else is carried
--   over verbatim from the live body:
--     * SELECT ... FOR UPDATE row lock on the plan;
--     * pending -> claiming -> claimed state machine;
--     * claimed_by_user_id acquired up front, released by rollback;
--     * tasks -> user_state.activities merged and de-duplicated by id;
--     * routines -> routines + routine_tasks + user_eggs with the same egg
--       conflict resolution (create / reuse-if-free / deterministic fallback /
--       reversible egg_unavailable);
--     * the `__materialized` audit marker, then `claimed` written LAST;
--     * the already_claimed / token_expired / invalid_status answers;
--     * SECURITY DEFINER and `SET search_path TO 'public', 'pg_temp'`.
--
--   The new guard is strictly STRONGER for this caller, because service_role
--   cannot prove identity from a JWT:
--     * only service_role may execute it (PUBLIC / anon / authenticated are
--       revoked);
--     * `p_user_id` must equal the plan's PERSISTED `funnel_user_id` — the
--       association the webhook already validated — so a plan can never be
--       materialized into somebody else's account;
--     * `purchase_confirmed_at` must be set, so an unpaid plan never
--       materializes;
--     * a plan already claimed by another account is still refused.
--
--   No email is read or trusted anywhere. No browser-supplied value is
--   accepted: the plan is addressed by id, ownership is read from the row, and
--   the activities/routines payload is built server-side by the Edge Function
--   from the stored plan JSON.
--
-- IDEMPOTENCY / RETRIES
--   A webhook retry converges: `claimed` replays `alreadyClaimed` for the same
--   owner, and a rolled-back attempt leaves the plan `claiming` + owner, which
--   this function accepts for the SAME user only.
--
-- IDENTITY ARGUMENTS CHANGE
--   (p_claim_token_hash text, p_user_id uuid, ...) -> (p_plan_id uuid, p_user_id uuid, ...)
--   The app path keeps calling `claim_funnel_plan`, which is NOT modified.
-- =====================================================

DO $do$
DECLARE
  v_def          TEXT;
  v_def_after    TEXT;
  v_swapped      TEXT;
  v_old_guard    CONSTANT TEXT :=
    'IF\s+p_user_id\s+IS\s+DISTINCT\s+FROM\s+auth\.uid\(\)\s+THEN\s+'
    || 'RETURN\s+jsonb_build_object\(''success'',\s*false,\s*''error'',\s*''forbidden''\);\s*'
    || 'END\s+IF;';
  v_new_guard    CONSTANT TEXT := $repl$  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;$repl$;
  v_notfound     CONSTANT TEXT :=
    'IF\s+NOT\s+FOUND\s+THEN\s+'
    || 'RETURN\s+jsonb_build_object\(''success'',\s*false,\s*''error'',\s*''invalid_token''\);\s*'
    || 'END\s+IF;';
  v_notfound_new CONSTANT TEXT := $repl$
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  -- Ownership: the plan may only be materialized into its OWN account.
  IF v_plan.funnel_user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Commercial gate: an unconfirmed purchase never materializes.
  IF v_plan.purchase_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'purchase_not_confirmed');
  END IF;$repl$;
BEGIN
  -- ── 0) Locate the live canonical function ────────────────────────────────
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
    RAISE EXCEPTION 'AUDIT FAIL: canonical claim_funnel_plan(text, uuid identity) was not found';
  END IF;

  -- ── 1) Refuse to emit anything we do not fully understand ───────────────
  IF position('SECURITY DEFINER' IN upper(v_def)) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: claim_funnel_plan is no longer SECURITY DEFINER';
  END IF;
  IF position('search_path' IN v_def) = 0
     OR position('public' IN v_def) = 0
     OR position('pg_temp' IN v_def) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: claim_funnel_plan no longer pins a safe search_path';
  END IF;
  IF position('FOR UPDATE' IN v_def) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: claim_funnel_plan lost its row lock';
  END IF;
  IF position('__materialized' IN v_def) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: claim_funnel_plan lost its __materialized marker';
  END IF;
  IF position('egg_unavailable' IN v_def) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: claim_funnel_plan lost its reversible egg_unavailable rollback';
  END IF;
  IF position('purchase_confirmed_at IS NULL AND' IN v_def) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: claim_funnel_plan lost the purchased-plans stay-valid patch';
  END IF;
  IF v_def !~ v_old_guard THEN
    RAISE EXCEPTION 'AUDIT FAIL: could not locate the canonical auth.uid() ownership guard; refusing to guess';
  END IF;
  IF v_def !~ v_notfound THEN
    RAISE EXCEPTION 'AUDIT FAIL: could not locate the post-lock NOT FOUND block; refusing to guess';
  END IF;
  IF (length(v_def) - length(replace(v_def, 'p_claim_token_hash', ''))) / length('p_claim_token_hash') <> 2 THEN
    RAISE EXCEPTION 'AUDIT FAIL: unexpected number of p_claim_token_hash references (expected 2)';
  END IF;

  -- ── 2) Build the variant: rename, re-address by id, swap the guard ───────
  v_swapped := replace(v_def, 'claim_funnel_plan', 'materialize_funnel_plan_for_purchase');
  v_swapped := regexp_replace(v_swapped, 'p_claim_token_hash\s+(text|TEXT)', 'p_plan_id uuid', 'g');
  v_swapped := regexp_replace(
    v_swapped,
    'WHERE\s+claim_token_hash\s*=\s*p_claim_token_hash',
    'WHERE id = p_plan_id',
    'g');
  v_swapped := regexp_replace(v_swapped, v_old_guard, v_new_guard, 'g');
  v_swapped := regexp_replace(v_swapped, v_notfound, v_notfound_new, 'g');
  -- The two-line comment above the old guard still mentions auth.uid(); rewrite
  -- it so the emitted body contains no misleading reference to it.
  v_swapped := regexp_replace(
    v_swapped,
    '--\s*HORIZONTAL ESCALATION GUARD:[^\r\n]*\r?\n\s*--\s*into their own account \(auth\.uid\(\)[^\r\n]*',
    '-- PURCHASE-SCOPED GUARD: this variant is called by service_role, so it cannot prove identity from a JWT. Ownership is re-derived from the plan row itself, and the comparison is a strict IS DISTINCT FROM so a session with no JWT claims at all is refused too.',
    'g');

  -- The original ownership guard must be gone. (The NOT FOUND block is kept on
  -- purpose by v_notfound_new, so only the ownership guard is asserted here.)
  IF v_swapped ~ v_old_guard THEN
    RAISE EXCEPTION 'AUDIT FAIL: the original auth.uid() ownership guard survived the swap';
  END IF;

  -- ── 3) Re-verify the RESULT before executing it ─────────────────────────
  IF position('p_claim_token_hash' IN v_swapped) <> 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: a p_claim_token_hash reference survived the swap';
  END IF;
  IF position('auth.uid()' IN v_swapped) <> 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: the auth.uid() guard survived the swap';
  END IF;
  IF position('materialize_funnel_plan_for_purchase' IN v_swapped) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: rename did not apply';
  END IF;
  IF position('p_plan_id uuid' IN v_swapped) = 0 OR position('WHERE id = p_plan_id' IN v_swapped) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: the plan is not addressed by id after the swap';
  END IF;
  IF position('auth.role() IS DISTINCT FROM ''service_role''' IN v_swapped) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: the service_role guard is missing';
  END IF;
  IF position('v_plan.funnel_user_id IS DISTINCT FROM p_user_id' IN v_swapped) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: the funnel_user_id ownership guard is missing';
  END IF;
  IF position('v_plan.purchase_confirmed_at IS NULL' IN v_swapped) = 0 THEN
    RAISE EXCEPTION 'AUDIT FAIL: the purchase_confirmed_at gate is missing';
  END IF;
  -- Every invariant below must still be present in the emitted body.
  IF position('SECURITY DEFINER' IN upper(v_swapped)) = 0
     OR position('search_path' IN v_swapped) = 0
     OR position('FOR UPDATE' IN v_swapped) = 0
     OR position('__materialized' IN v_swapped) = 0
     OR position('egg_unavailable' IN v_swapped) = 0
     OR position('purchase_confirmed_at IS NULL AND' IN v_swapped) = 0
     OR position('already_claimed' IN v_swapped) = 0
     OR position('claim_not_owned' IN v_swapped) = 0
     OR position('claiming' IN v_swapped) = 0
     OR position('claimed' IN v_swapped) = 0
  THEN
    RAISE EXCEPTION 'AUDIT FAIL: the emitted body lost a canonical invariant';
  END IF;

  EXECUTE v_swapped;

  -- ── 4) service_role and nobody else ─────────────────────────────────────
  REVOKE ALL ON FUNCTION public.materialize_funnel_plan_for_purchase(UUID, UUID, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.materialize_funnel_plan_for_purchase(UUID, UUID, JSONB, JSONB) TO service_role;

  -- ── 5) Post-condition check ─────────────────────────────────────────────
  IF NOT has_function_privilege('service_role', 'public.materialize_funnel_plan_for_purchase(uuid,uuid,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'AUDIT FAIL: service_role cannot execute the new function';
  END IF;
  IF has_function_privilege('anon', 'public.materialize_funnel_plan_for_purchase(uuid,uuid,jsonb,jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.materialize_funnel_plan_for_purchase(uuid,uuid,jsonb,jsonb)', 'EXECUTE')
     OR has_function_privilege('public', 'public.materialize_funnel_plan_for_purchase(uuid,uuid,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'AUDIT FAIL: the new function is executable by anon/authenticated/PUBLIC';
  END IF;
  -- The mobile path must be byte-identical to what we read in step 0.
  SELECT pg_get_functiondef(p.oid)
    INTO v_def_after
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'claim_funnel_plan'
      AND pg_get_function_identity_arguments(p.oid) =
          'p_claim_token_hash text, p_user_id uuid, p_activities jsonb, p_routines jsonb';
  IF v_def_after IS DISTINCT FROM v_def THEN
    RAISE EXCEPTION 'AUDIT FAIL: claim_funnel_plan changed';
  END IF;
END
$do$;

COMMENT ON FUNCTION public.materialize_funnel_plan_for_purchase(UUID, UUID, JSONB, JSONB) IS
  'Purchase-scoped entry point generated from the live claim_funnel_plan body: same row lock, same pending/claiming/claimed state machine, same activity de-duplication, same egg resolution with reversible egg_unavailable, same __materialized marker and same idempotent replay. Only service_role may execute it; it materializes exclusively into the plan''s own funnel_user_id and only after purchase_confirmed_at. Used by revenuecat-webhook so the plan content exists BEFORE onboarding_completed is stamped and BEFORE the credentials email is sent. The app path keeps using claim_funnel_plan with the owner JWT.';