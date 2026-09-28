-- =====================================================
-- claim_funnel_plan() — EGG CONFLICT RESOLUTION
-- Created: 2026-09-18
--
-- Supersedes the egg block shipped inside
-- 20260917_funnel_plans_single_contract.sql. Nothing else changes
-- (state machine, ownership model, atomicity, __materialized marker).
--
-- Guarantee: after a VALID claim, every funnel routine that requested an
-- egg MUST end up with exactly one companion. Resolution per routine:
--
--   1. Requested egg (routine.egg.catalogId):
--        a) not in user_eggs            -> create + link to the new routine
--        b) owned with routine_id NULL  -> REUSE that row (preserve XP/pet
--                                            progress) and link it
--        c) owned and already assigned  -> do NOT move it; go to fallback
--   2. Fallback (deterministic):
--        a) an owned & free egg (routine_id IS NULL), preferring the egg set
--           referenced by this funnel plan, then lowest id
--        b) an unowned, active catalog egg, preferring the plan egg set,
--           then lowest id
--   3. If NO candidate exists -> recoverable error
--        RAISE errcode P0001 message 'egg_unavailable'. The EXCEPTION
--        handler rolls back the WHOLE materialization and keeps the plan
--        'claiming' + owner so the user can retry (e.g. after freeing an egg).
--        Never leaves a companion-less routine silently.
--
-- Invariants preserved:
--   * UNIQUE (user_id, egg_id) — a user NEVER owns two rows of the same
--     catalog egg.
--   * An egg assigned to another routine is NEVER moved.
--   * eggCount / egg_ids / routine.eggCatalogId report the REAL companion
--     associated with each materialized routine (created OR reused); the
--     __materialized marker and buildReplaySummary stay consistent.
--   * Selection is deterministic (funnel plan egg set DESC, id ASC), so a
--     retry after rollback resolves to the same companion.
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
  v_requested_egg INTEGER;
  v_assigned_egg INTEGER;
  v_candidate INTEGER;
  v_egg_exists BOOLEAN;
  v_egg_free BOOLEAN;
  v_allowed_egg_ids INTEGER[];
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

    -- Egg set referenced by THIS plan: used to bias deterministic fallback
    -- selection towards the companions the funnel web already proposed.
    v_allowed_egg_ids := ARRAY(
      SELECT DISTINCT (val->'egg'->>'catalogId')::INTEGER
      FROM jsonb_array_elements(v_ins_routines) AS val
      WHERE val->'egg'->>'catalogId' ~ '^[0-9]+$'
    );

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

        -- Egg -> user_eggs (conflict resolution, see header). Every funnel
        -- routine that requests an egg MUST end up with exactly one
        -- companion: create, reuse, deterministic fallback, or a REVERSIBLE
        -- failure that keeps the plan 'claiming' (never a silent lone routine).
        v_requested_egg := NULL;
        v_assigned_egg := NULL;

        IF v_routine->'egg'->>'catalogId' ~ '^[0-9]+$' THEN
          v_requested_egg := (v_routine->'egg'->>'catalogId')::INTEGER;

          SELECT EXISTS (
            SELECT 1 FROM public.egg_catalog WHERE id = v_requested_egg AND active
          ) INTO v_egg_exists;

          IF v_egg_exists THEN
            SELECT (routine_id IS NULL) INTO v_egg_free
            FROM public.user_eggs
            WHERE user_id = p_user_id AND egg_id = v_requested_egg;

            IF NOT FOUND THEN
              -- 1a) requested egg is brand new -> create + link.
              INSERT INTO public.user_eggs (user_id, egg_id, routine_id, unlocked, xp, evolved, pet_xp, pet_level)
              VALUES (p_user_id, v_requested_egg, v_routine_id, TRUE, 0, FALSE, 0, 0);
              v_assigned_egg := v_requested_egg;
            ELSIF v_egg_free THEN
              -- 1b) owned & free -> REUSE the row (keeps XP/pet progress).
              UPDATE public.user_eggs
                SET routine_id = v_routine_id, updated_at = NOW()
                WHERE user_id = p_user_id AND egg_id = v_requested_egg;
              v_assigned_egg := v_requested_egg;
            ELSE
              -- 1c) owned & assigned elsewhere -> NEVER move it; fallback.
              v_candidate := NULL;

              -- 2a) owned & free egg (prefer plan egg set, then lowest id).
              SELECT e.egg_id INTO v_candidate
              FROM public.user_eggs e
              JOIN public.egg_catalog c ON c.id = e.egg_id
              WHERE e.user_id = p_user_id
                AND e.routine_id IS NULL
                AND c.active
              ORDER BY (e.egg_id = ANY(v_allowed_egg_ids)) DESC, e.egg_id
              LIMIT 1;

              -- 2b) unowned & active catalog egg (same deterministic order).
              IF v_candidate IS NULL THEN
                SELECT c.id INTO v_candidate
                FROM public.egg_catalog c
                WHERE c.active
                  AND NOT EXISTS (
                    SELECT 1 FROM public.user_eggs u
                    WHERE u.user_id = p_user_id AND u.egg_id = c.id
                  )
                ORDER BY (c.id = ANY(v_allowed_egg_ids)) DESC, c.id
                LIMIT 1;
              END IF;

              IF v_candidate IS NULL THEN
                -- 3) No eligible companion at all -> recoverable error.
                RAISE EXCEPTION USING
                  ERRCODE = 'P0001',
                  MESSAGE = 'egg_unavailable';
              END IF;

              -- owned & free -> re-link the existing row;
              -- unowned catalog -> create a brand-new row (preserves
              -- UNIQUE (user_id, egg_id): v_candidate is guaranteed unowned
              -- by the 2b query).
              IF EXISTS (
                SELECT 1 FROM public.user_eggs
                WHERE user_id = p_user_id AND egg_id = v_candidate
              ) THEN
                UPDATE public.user_eggs
                  SET routine_id = v_routine_id, updated_at = NOW()
                  WHERE user_id = p_user_id AND egg_id = v_candidate;
              ELSE
                INSERT INTO public.user_eggs (user_id, egg_id, routine_id, unlocked, xp, evolved, pet_xp, pet_level)
                VALUES (p_user_id, v_candidate, v_routine_id, TRUE, 0, FALSE, 0, 0);
              END IF;
              v_assigned_egg := v_candidate;
            END IF;
          END IF;
        END IF;

        IF v_assigned_egg IS NOT NULL THEN
          v_egg_count := v_egg_count + 1;
          v_egg_ids := v_egg_ids || jsonb_build_array(to_jsonb(v_assigned_egg));
        END IF;

        v_routine_out := jsonb_build_object(
          'id', v_routine_id,
          'name', v_routine_name,
          'icon', v_routine_icon,
          'steps', v_step_count,
          -- The REAL companion associated with this routine (created or reused).
          'eggCatalogId', v_assigned_egg
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
  'Atomically claims a web funnel plan under the single pending/claiming/claimed/expired contract. Acquires claimed_by_user_id at start; a failed claim keeps claiming+owner for idempotent retry by the SAME user; claimed only after full materialization. Egg conflict resolution: create, reuse-if-free, or deterministic fallback to another companion so every funnel routine that requested an egg ends with exactly one; if no candidate exists it raises egg_unavailable (P0001) and stays claiming. UNIQUE(user_id, egg_id) preserved. eggCount/egg_ids/eggCatalogId report the REAL associated companions.';