-- =====================================================
-- web_funnel_plans — SINGLE CANONICAL CONTRACT
-- Created: 2026-09-17
--
-- This migration is the SINGLE owner of the transform. The funnel web repo's
-- "20260916000000_secure_funnel_plans_claim.sql" must NOT also be applied to
-- this project — reconcile that file with the contract below before deploy.
--
-- New contract (no dual compatibility):
--   status           -> pending | claiming | claimed | expired
--   claim_owner      -> claimed_by_user_id (replaces user_id)
--   claim_token_hash -> unchanged (raw token NEVER stored)
--
-- Ownership model:
--   * pending  : funnel web finalized the plan; ready to be claimed.
--   * claiming : the app acquired ownership atomically at the START of
--                materialization (claimed_by_user_id = auth.uid()).
--                An interrupted claim keeps claiming + owner so ONLY that
--                user can retry idempotently. NULL owner is never a normal
--                flow state (legacy exception only).
--   * claimed  : only AFTER the WHOLE materialization succeeded.
--   * expired  : terminal (explicit or by expires_at).
--
-- Materialization logic (tasks/routines/eggs, ON CONFLICT idempotency,
-- GET DIAGNOSTICS egg counting) is UNCHANGED from the validated E2E.
-- =====================================================

-- ── 1) New owner column (nullable while legacy rows still carry user_id) ─────
ALTER TABLE public.web_funnel_plans
  ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2) SAFE BACKFILL before dropping/renaming legacy pieces ──────────────────
--    status: draft / completed            -> pending
--    owner : user_id                      -> claimed_by_user_id
--    legacy 'claiming' with NULL owner    -> left as-is (exceptional; handled
--                                           case by case, NEVER auto-assigned).
UPDATE public.web_funnel_plans
   SET status = 'pending',
       updated_at = NOW()
 WHERE status IN ('draft', 'completed');

-- Some staging databases may already have dropped the legacy user_id column
-- after a partial/manual run. Use dynamic SQL so PostgreSQL does not parse a
-- reference to a column that is absent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'web_funnel_plans'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.web_funnel_plans
         SET claimed_by_user_id = user_id
       WHERE user_id IS NOT NULL
    $sql$;
  END IF;
END
$$;

-- Re-apply the runtime expiry rule to backfilled rows so a plan that was
-- already past its window becomes 'expired' (was completed -> expired).
UPDATE public.web_funnel_plans
   SET status = 'expired',
       updated_at = NOW()
 WHERE status IN ('pending', 'claiming')
   AND expires_at IS NOT NULL
   AND expires_at < NOW();

-- ── 3) Status state machine — single canonical set ───────────────────────────
ALTER TABLE public.web_funnel_plans
  DROP CONSTRAINT IF EXISTS web_funnel_plans_status_check;

ALTER TABLE public.web_funnel_plans
  ADD CONSTRAINT web_funnel_plans_status_check
  CHECK (status IN ('pending', 'claiming', 'claimed', 'expired'));

ALTER TABLE public.web_funnel_plans
  ALTER COLUMN status SET DEFAULT 'pending';

-- ── 4) Drop the legacy owner column (index + FK + column) ────────────────────
DROP INDEX IF EXISTS idx_web_funnel_plans_user_id;

ALTER TABLE public.web_funnel_plans
  DROP CONSTRAINT IF EXISTS web_funnel_plans_user_id_fkey;

ALTER TABLE public.web_funnel_plans
  DROP COLUMN IF EXISTS user_id;

CREATE INDEX IF NOT EXISTS idx_web_funnel_plans_claimed_by_user_id
  ON public.web_funnel_plans(claimed_by_user_id);

-- ── 5) RLS — anon funnel web inserts ONLY 'pending' plans (was 'draft') ──────
DROP POLICY IF EXISTS "Funnel can insert draft plans" ON public.web_funnel_plans;
DROP POLICY IF EXISTS "Funnel can insert pending plans" ON public.web_funnel_plans;

CREATE POLICY "Funnel can insert pending plans"
  ON public.web_funnel_plans FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- ── 6) Comments ──────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.web_funnel_plans.status IS
  'State machine: pending -> claiming -> claimed (expired is terminal). The app acquires claiming + claimed_by_user_id atomically at the start of materialization; claimed only after full success.';

COMMENT ON COLUMN public.web_funnel_plans.claimed_by_user_id IS
  'Claim owner, assigned immediately on pending -> claiming (auth.uid()). Replay/retry is allowed for this user only. NULL is never a normal flow state.';

COMMENT ON TABLE public.web_funnel_plans IS
  'Plans built on the funnel web, claimed in-app (via restore-funnel-plan by verified email, or legacy deep link brainy://claim?token=...).';

-- =====================================================
-- claim_funnel_plan() — NEW STATE MACHINE
-- -----------------------------------------------------
--   pending (owner NULL)          -> acquiring (claiming) + owner
--   claiming + owner = auth.uid() -> idempotent retry by the SAME user
--   claiming + owner != auth.uid()/NULL -> rejected (never stolen)
--   claimed  + owner = auth.uid() -> idempotent replay success
--   claimed  + owner != auth.uid() -> rejected
--   expired                        -> rejected
--
-- Status flips to 'claimed' ONLY after the whole materialization succeeded.
-- If anything fails, the EXCEPTION rollback discards the partial
-- materialization and the handler PERSISTS 'claiming' + owner so the SAME
-- user can resume (nothing duplicated thanks to atomicity + ON CONFLICT).
-- eggCount / eggCatalogId continue to report ONLY eggs actually
-- materialized (GET DIAGNOSTICS ROW_COUNT).
-- =====================================================

CREATE OR REPLACE FUNCTION public.claim_funnel_plan(
  p_claim_token_hash TEXT,
  p_user_id UUID,
  p_activities JSONB DEFAULT '[]'::jsonb,
  p_routines JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan web_funnel_plans%ROWTYPE;
  v_existing JSONB := '[]'::jsonb;
  v_merged JSONB := '[]'::jsonb;
  v_routine_rows JSONB := '[]'::jsonb;
  v_routine JSONB;
  v_step JSONB;
  v_routine_id UUID;
  v_egg_id INTEGER;
  v_egg_exists BOOLEAN;
  v_egg_inserted INTEGER := 0;
  v_task_count INTEGER := 0;
  v_routine_count INTEGER := 0;
  v_egg_count INTEGER := 0;
  v_step_count INTEGER;
  v_step_position INTEGER;
  v_ins_activities JSONB := COALESCE(p_activities, '[]'::jsonb);
  v_ins_routines JSONB := COALESCE(p_routines, '[]'::jsonb);
  v_routine_name TEXT;
  v_routine_icon TEXT;
  v_routine_days TEXT[];
  v_routine_out JSONB;
  v_routine_ids JSONB := '[]'::jsonb;
  v_egg_ids JSONB := '[]'::jsonb;
BEGIN
  -- HORIZONTAL ESCALATION GUARD: callers may only materialize
  -- into their own account (auth.uid() is set by the request JWT).
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Concurrency-safe: lock the claim row so two simultaneous
  -- redemptions of the same token serialize.
  SELECT * INTO v_plan
  FROM public.web_funnel_plans
  WHERE claim_token_hash = p_claim_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  -- Already claimed -> idempotent replay for the same owner only.
  IF v_plan.status = 'claimed' THEN
    IF v_plan.claimed_by_user_id IS NOT DISTINCT FROM p_user_id THEN
      RETURN jsonb_build_object('success', true, 'alreadyClaimed', true, 'planId', v_plan.id, 'claimedBy', v_plan.claimed_by_user_id);
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- Explicitly expired.
  IF v_plan.status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_expired');
  END IF;

  -- Expired by time.
  IF v_plan.expires_at IS NOT NULL AND v_plan.expires_at < NOW() THEN
    UPDATE public.web_funnel_plans
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_plan.id;
    RETURN jsonb_build_object('success', false, 'error', 'token_expired');
  END IF;

  -- 'claiming' -> ONLY the same owner may retry. A NULL owner is the legacy
  -- migration exception and is NEVER a normal claimable state.
  IF v_plan.status = 'claiming' THEN
    IF v_plan.claimed_by_user_id IS NULL OR v_plan.claimed_by_user_id IS DISTINCT FROM p_user_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'claim_not_owned');
    END IF;
    -- fall through: idempotent retry by the same owner
  END IF;

  -- Only ready states can be materialized.
  IF v_plan.status NOT IN ('pending', 'claiming') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  BEGIN
    -- Acquire ownership IMMEDIATELY (pending -> claiming). If anything below
    -- fails, the rollback discards the partial materialization and the
    -- EXCEPTION handler PERSISTS 'claiming' + owner for the SAME user.
    UPDATE public.web_funnel_plans
    SET status = 'claiming',
        claimed_by_user_id = p_user_id,
        updated_at = NOW()
    WHERE id = v_plan.id;

    -- ─── 1) TASKS -> user_state.activities (merge, no duplicates) ──────────
    IF jsonb_typeof(v_ins_activities) = 'array' THEN
      v_task_count := jsonb_array_length(v_ins_activities);

      SELECT COALESCE(activities, '[]'::jsonb) INTO v_existing
      FROM public.user_state
      WHERE user_id = p_user_id;

      IF v_existing IS NULL THEN
        v_existing := '[]'::jsonb;
      ELSE
        -- Keep existing activities and DROP any incoming one whose id
        -- already exists (deterministic ids -> dedupe by id).
        SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_existing
        FROM jsonb_array_elements(v_existing) e
        WHERE NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_ins_activities) i
          WHERE i->>'id' IS NOT NULL AND i->>'id' = e->>'id'
        );
      END IF;

      v_merged := v_existing || v_ins_activities;

      INSERT INTO public.user_state (user_id, activities, updated_at)
      VALUES (p_user_id, v_merged, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET activities = EXCLUDED.activities, updated_at = NOW();
    END IF;

    -- ─── 2) ROUTINES -> routines + routine_tasks + user_eggs ──────────────
    IF jsonb_typeof(v_ins_routines) = 'array' THEN
      FOR v_routine IN SELECT jsonb_array_elements(v_ins_routines)
      LOOP
        v_routine_name := COALESCE(NULLIF(btrim(v_routine->>'name'), ''), 'Rutina');
        v_routine_icon := COALESCE(NULLIF(v_routine->>'icon', ''), 'Circle');
        v_routine_days := ARRAY(
          SELECT jsonb_array_elements_text(COALESCE(v_routine->'days', '[]'::jsonb))
        );

        INSERT INTO public.routines (user_id, name, days, icon)
        VALUES (p_user_id, v_routine_name, v_routine_days, v_routine_icon)
        RETURNING id INTO v_routine_id;

        v_routine_count := v_routine_count + 1;
        v_routine_ids := v_routine_ids || jsonb_build_array(to_jsonb(v_routine_id));

        -- Steps -> routine_tasks (skips empty titles).
        v_step_position := 0;
        v_step_count := 0;
        FOR v_step IN SELECT jsonb_array_elements(COALESCE(v_routine->'steps', '[]'::jsonb))
        LOOP
          IF NULLIF(btrim(v_step->>'title'), '') IS NOT NULL THEN
            INSERT INTO public.routine_tasks (routine_id, title, position)
            VALUES (v_routine_id, btrim(v_step->>'title'), v_step_position);
            v_step_position := v_step_position + 1;
            v_step_count := v_step_count + 1;
          END IF;
        END LOOP;

        -- Egg -> user_eggs. Validates the catalog id and NEVER reassigns
        -- an egg the user already owns (ON CONFLICT DO NOTHING preserves
        -- existing progress / assignments). Only a REAL insert counts as
        -- a materialized association.
        v_egg_id := NULL;
        v_egg_inserted := 0;
        IF v_routine->'egg'->>'catalogId' ~ '^[0-9]+$' THEN
          v_egg_id := (v_routine->'egg'->>'catalogId')::INTEGER;
          SELECT EXISTS (
            SELECT 1 FROM public.egg_catalog WHERE id = v_egg_id
          ) INTO v_egg_exists;

          IF v_egg_exists THEN
            INSERT INTO public.user_eggs (user_id, egg_id, routine_id, unlocked, xp, evolved, pet_xp, pet_level)
            VALUES (p_user_id, v_egg_id, v_routine_id, TRUE, 0, FALSE, 0, 0)
            ON CONFLICT (user_id, egg_id) DO NOTHING;
            GET DIAGNOSTICS v_egg_inserted = ROW_COUNT;

            IF v_egg_inserted > 0 THEN
              v_egg_count := v_egg_count + 1;
              v_egg_ids := v_egg_ids || jsonb_build_array(to_jsonb(v_egg_id));
            END IF;
          END IF;
        END IF;

        v_routine_out := jsonb_build_object(
          'id', v_routine_id,
          'name', v_routine_name,
          'icon', v_routine_icon,
          'steps', v_step_count,
          -- Only report the companion when THIS claim materialized it.
          'eggCatalogId', CASE WHEN v_egg_inserted > 0 THEN v_egg_id ELSE NULL END
        );

        v_routine_rows := v_routine_rows || jsonb_build_array(v_routine_out);
      END LOOP;
    END IF;

    -- ─── 3) IDEMPOTENCY AUDIT MARKER on the claim row ──────────────────────
    UPDATE public.web_funnel_plans
    SET plan = v_plan.plan || jsonb_build_object(
          '__materialized', jsonb_build_object(
            'claimed_by_user_id', p_user_id,
            'claimed_at', NOW(),
            'task_count', v_task_count,
            'routine_count', v_routine_count,
            'egg_count', v_egg_count,
            'routine_ids', v_routine_ids,
            'egg_ids', v_egg_ids
          )
        ),
        updated_at = NOW()
    WHERE id = v_plan.id;

    -- ─── 4) FINALIZE only after the WHOLE materialization succeeded ────────
    UPDATE public.web_funnel_plans
    SET status = 'claimed',
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_plan.id;

    RETURN jsonb_build_object(
      'success', true,
      'alreadyClaimed', false,
      'planId', v_plan.id,
      'taskCount', v_task_count,
      'routineCount', v_routine_count,
      'eggCount', v_egg_count,
      'claimedAt', NOW(),
      'routines', v_routine_rows
    );

  EXCEPTION WHEN OTHERS THEN
    -- Keep 'claiming' + owner so ONLY this user can retry idempotently.
    -- Never convert a NULL owner into a claim (legacy exception untouched).
    BEGIN
      UPDATE public.web_funnel_plans
      SET status = 'claiming',
          claimed_by_user_id = p_user_id,
          updated_at = NOW()
      WHERE id = v_plan.id
        AND v_plan.status <> 'claimed';
    EXCEPTION WHEN OTHERS THEN
      NULL; -- best effort; the row still carries the lock-consistent state
    END;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
  END;
END;
$$;

-- Only authenticated users may redeem plans (the Edge Function
-- also requires a valid JWT). Deny anon/PUBLIC by default.
REVOKE EXECUTE ON FUNCTION public.claim_funnel_plan FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_funnel_plan TO authenticated;

COMMENT ON FUNCTION public.claim_funnel_plan IS
  'Atomically claims a web funnel plan under the single pending/claiming/claimed/expired contract. Acquires claimed_by_user_id at start; a failed claim keeps claiming+owner for idempotent retry by the SAME user; claimed only after full materialization. eggCount/eggCatalogId reflect ONLY eggs actually materialized.';

-- =====================================================
-- consume_funnel_redemption() — owner column renamed
-- =====================================================
DROP FUNCTION IF EXISTS public.consume_funnel_redemption(UUID);

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

  -- Horizontal-escalation guard: only the claim OWNER may consume.
  IF v_plan.claimed_by_user_id IS DISTINCT FROM auth.uid() THEN
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
  'Marks a plan''s pending RevenueCat redemption as consumed (sets revenuecat_redemption_url = NULL). Only callable by the claim owner (auth.uid() = claimed_by_user_id). Idempotent.';