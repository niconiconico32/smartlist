-- ============================================================================
-- revenuecat-webhook — Pruebas de ESCRITURA (revertidas)
-- ============================================================================
-- !! ESTE ARCHIVO ESCRIBE DATAS. No lo ejecutes en producción sin revisar. !!
--
-- Orden previo obligatorio (ambos de solo lectura):
--   supabase/verification/preflight-before-migration.sql     (antes de migrar)
--   supabase/verification/verify-after-migration-readonly.sql (después)
--
-- Todo ocurre dentro de BEGIN ... ROLLBACK: las filas de prueba se deshacen al
-- final y no queda rastro. Confírmalo con la §4 (leaked_rows debe ser 0).
--
-- Cada sub-bloque emite un NOTICE con su veredicto. Todos deben decir "OK".
-- Un "FALLO" significa que la garantía que crees tener NO está en la base.
-- ============================================================================


BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Las 6 pruebas de restricción
--    No depende de ningún UUID fijo: toma planes reales del catálogo.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_plan  UUID;
  v_plan2 UUID;
  v_user  UUID := gen_random_uuid();
  v_scope TEXT := 'app-verify|stripe|production';
  v_other TEXT := 'app-verify|stripe|sandbox';
BEGIN
  -- 1.0 ¿Hay algún plan que usar? Si no, se informa y no se prueba nada.
  --     Los tests 1.2/1.3/1.4/1.5 solo necesitan 1 plan; 1.4 usa un segundo si
  --     existe, y si no, un UUID sintético (ver nota dentro de 1.4).
  SELECT id INTO v_plan FROM public.web_funnel_plans ORDER BY created_at, id LIMIT 1;
  IF v_plan IS NULL THEN
    RAISE NOTICE 'SKIP: web_funnel_plans esta vacia; crea un funnel de prueba o ajusta este script. Nada se probo.';
    RETURN;
  END IF;
  RAISE NOTICE 'Plan de prueba: %', v_plan;

  -- Segundo plan, si hay otro disponible. Permite una prueba 1.4 totalmente
  -- concluyente (FK valida, solo el trigger puede rechazar).
  SELECT id INTO v_plan2 FROM public.web_funnel_plans
   WHERE id <> v_plan ORDER BY created_at, id LIMIT 1;

  -- 1.1 INSERT base -> debe funcionar
  INSERT INTO public.revenuecat_purchase_plans
    (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
  VALUES
    (v_scope, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);
  RAISE NOTICE 'OK 1.1: insert base aceptado';

  -- 1.2 Mismo (scope, transaction_id) -> 23505
  --     Una compra no puede asociarse dos veces dentro del mismo scope.
  --     Concreto incluso usando el mismo plan: el indice UNIQUE se evalua antes
  --     que la FK, asi que el 23505 no puede venir de otra causa.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-1', 'tx-verify-origin-2', v_user, v_plan);
    RAISE NOTICE 'FALLO 1.2: se permitio duplicar transaction_id en el mismo scope';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 1.2: transaction_id duplicado rechazado (23505)';
  END;

  -- 1.3 Mismo (scope, original_transaction_id) -> 23505
  --     GARANTIA CLAVE: una renovacion nunca puede pegarse a un plan distinto
  --     del de la compra que la origino.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-2', 'tx-verify-origin', v_user, v_plan);
    RAISE NOTICE 'FALLO 1.3: se permitio reutilizar original_transaction_id';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 1.3: original_transaction_id duplicado rechazado (23505)';
  END;

  -- 1.4 UPDATE de plan_id -> el trigger debe rechazarlo
  --     IMPORTANTE: el valor asignado debe ser DISTINTO del actual. Asignar el
  --     mismo plan no activaria NEW.plan_id IS DISTINCT FROM OLD.plan_id y la
  --     prueba no probaria nada. Por eso:
  --       a) con segundo plan real: FK valida, el trigger es lo UNICO que
  --          puede rechazar -> concluyente al 100%.
  --       b) sin segundo plan: UUID sintetico. El trigger BEFORE UPDATE actua
  --          antes que la FK, asi que tambien debe ser concluyente; se
  --          distingue el caso por si algo mas lo rechazara antes.
  IF v_plan2 IS NOT NULL THEN
    BEGIN
      UPDATE public.revenuecat_purchase_plans
         SET plan_id = v_plan2
       WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
      RAISE NOTICE 'FALLO 1.4a: se permitio mover plan_id a otro plan real';
    EXCEPTION WHEN integrity_constraint_violation THEN
      RAISE NOTICE 'OK 1.4a: plan_id inmutable rechazado por trigger (2o plan real, concluyente)';
    END;
  ELSE
    RAISE NOTICE 'AVISO: solo hay un plan en web_funnel_plans; 1.4 usara un UUID sintetico.';
    BEGIN
      UPDATE public.revenuecat_purchase_plans
         SET plan_id = gen_random_uuid()
       WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
      RAISE NOTICE 'FALLO 1.4b: se permitio mover plan_id';
    EXCEPTION WHEN integrity_constraint_violation THEN
      RAISE NOTICE 'OK 1.4b: plan_id inmutable rechazado por trigger (UUID sintetico)';
    EXCEPTION WHEN foreign_key_violation THEN
      -- Inconcluyente: la FK salto antes que el trigger. Necesitas un segundo
      -- plan real en web_funnel_plans para cerrar la prueba del trigger.
      RAISE WARNING 'INCONCLUYENTE 1.4b: la FK rechazo antes que el trigger; crea un segundo plan y repite.';
    END;
  END;

  -- 1.5 NULL en original_transaction_id NO colisiona (indice parcial)
  --     Varias compras nuevas sin origen pueden convivir.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-3', NULL, v_user, v_plan);
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-4', NULL, v_user, v_plan);
    RAISE NOTICE 'OK 1.5: NULL original_transaction_id no colisiona (indice parcial)';
  END;

  -- 1.6 Mismo transaction_id en OTRO scope -> debe permitirse
  --     Sandbox y produccion son compras distintas.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_other, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);
    RAISE NOTICE 'OK 1.6: mismo transaction_id en otro scope permitido';
  END;

  -- 1.7 Filas dentro de la transaccion: 4 (1.1 + 1.5 x2 + 1.6)
  RAISE NOTICE 'Filas en la transaccion (esperado 4): %',
    (SELECT count(*) FROM public.revenuecat_purchase_plans WHERE scope_key LIKE 'app-verify%');
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Lo que quedo insertado, visible antes de revertir
-- ────────────────────────────────────────────────────────────────────────────
SELECT scope_key, transaction_id, original_transaction_id, plan_id
  FROM public.revenuecat_purchase_plans
 WHERE scope_key LIKE 'app-verify%'
 ORDER BY scope_key, transaction_id;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Deshacer TODO
-- ────────────────────────────────────────────────────────────────────────────
ROLLBACK;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. Confirmacion: no debe quedar nada
--    Esperado: leaked_rows = 0
-- ────────────────────────────────────────────────────────────────────────────
SELECT count(*) AS leaked_rows
  FROM public.revenuecat_purchase_plans
 WHERE scope_key LIKE 'app-verify%';
