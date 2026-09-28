-- =====================================================
-- claim_funnel_plan() - ATOMIC, IDEMPOTENT REDEMPTION
-- Created: 2026-05-12
-- Purpose: Atomically claim a web funnel plan and
-- materialize it into the user's account:
--   1. Tasks      -> user_state.activities (JSONB merge)
--   2. Routines   -> routines + routine_tasks rows
--   3. Eggs       -> user_eggs rows (never reassigns)
--
-- IDEMPOTENCY STRATEGY
--   The web_funnel_plans row is used as the lock and the
--   state machine (status: draft -> completed -> claimed).
--   SELECT ... FOR UPDATE serializes concurrent claims on
--   the same token. The whole materialization + status flip
--   to 'claimed' happen inside a single transaction, so a
--   mid-flight failure rolls everything back and a retry
--   re-runs cleanly. Replays for the same user return
--   alreadyClaimed without touching data again.
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

  -- Already redeemed -> idempotent replay for the same owner.
  IF v_plan.status = 'claimed' THEN
    IF v_plan.user_id = p_user_id THEN
      RETURN jsonb_build_object('success', true, 'alreadyClaimed', true, 'planId', v_plan.id);
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

  -- Only ready plans can be redeemed (the funnel web flips draft -> completed).
  IF v_plan.status = 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'plan_not_ready');
  END IF;

  IF v_plan.status NOT IN ('draft', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  BEGIN
    -- Flip state FIRST inside the transaction. Any failure below
    -- rolls this back, leaving the plan redeemable again.
    UPDATE public.web_funnel_plans
    SET status = 'claimed', user_id = p_user_id, claimed_at = NOW(), updated_at = NOW()
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
        -- existing progress / assignments).
        v_egg_id := NULL;
        IF v_routine->'egg'->>'catalogId' ~ '^[0-9]+$' THEN
          v_egg_id := (v_routine->'egg'->>'catalogId')::INTEGER;
          SELECT EXISTS (
            SELECT 1 FROM public.egg_catalog WHERE id = v_egg_id
          ) INTO v_egg_exists;

          IF v_egg_exists THEN
            INSERT INTO public.user_eggs (user_id, egg_id, routine_id, unlocked, xp, evolved, pet_xp, pet_level)
            VALUES (p_user_id, v_egg_id, v_routine_id, TRUE, 0, FALSE, 0, 0)
            ON CONFLICT (user_id, egg_id) DO NOTHING;
            v_egg_count := v_egg_count + 1;
            v_egg_ids := v_egg_ids || jsonb_build_array(to_jsonb(v_egg_id));
          END IF;
        END IF;

        v_routine_out := jsonb_build_object(
          'id', v_routine_id,
          'name', v_routine_name,
          'icon', v_routine_icon,
          'steps', v_step_count,
          'eggCatalogId', v_egg_id
        );

        v_routine_rows := v_routine_rows || jsonb_build_array(v_routine_out);
      END LOOP;
    END IF;

    -- ─── 3) IDEMPOTENCY AUDIT MARKER on the claim row ──────────────────────
    UPDATE public.web_funnel_plans
    SET plan = v_plan.plan || jsonb_build_object(
          '__materialized', jsonb_build_object(
            'user_id', p_user_id,
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
  'Atomically claims a web funnel plan and materializes tasks (user_state.activities), routines (routines + routine_tasks) and eggs (user_eggs). Idempotent via row lock + status state machine + __materialized audit marker.';