-- ============================================================================
-- revenuecat-webhook — Pruebas de ESCRITURA (revertidas)
-- ============================================================================
-- !! ESTE ARCHIVO ESCRIBE DATAS. No lo ejecutes en produccion sin revisar. !!
--
-- Orden previo obligatorio (ambos de solo lectura):
--   supabase/verification/preflight-before-migration.sql     (antes de migrar)
--   supabase/verification/verify-after-migration-readonly.sql (despues)
--
-- Las seis pruebas ocurren dentro de BEGIN ... ROLLBACK: las filas de prueba se
-- deshacen y no queda rastro. El §3 lo confirma (leaked_rows debe ser 0).
--
-- Sobre la salida
-- --------------
-- Un ROLLBACK descarta todo lo transaccional, incluido un SET de sesion y una
-- tabla temporal, asi que por via CLI no hay forma de leer los veredictos
-- DESPUES de revertir. Ademas la CLI solo muestra el resultado de la ultima
-- sentencia y no muestra los RAISE NOTICE. Por eso este script se limita a
-- ejecutar las seis pruebas y confirmar leaked_rows = 0.
--
-- Para leer el detalle de cada prueba usa el gemelo
--   verify-revenuecat-webhook-writes-report.sql
-- que ejecuta las mismas seis pruebas y reporta cada veredicto ANTES de
-- abortar la transaccion. Ese tambien revierte todo: abortar y revertir son
-- equivalentes en cuanto a datos persistidos.
-- ============================================================================


BEGIN;

DO $$
DECLARE
  v_plan  UUID;
  v_plan2 UUID;
  v_user  UUID := gen_random_uuid();
  v_scope TEXT := 'app-verify|stripe|production';
  v_other TEXT := 'app-verify|stripe|sandbox';
  v_rows  BIGINT;
BEGIN
  -- 1.0 ¿Hay algun plan que usar? Si no, se informa y no se prueba nada.
  --     Las pruebas 1.2, 1.3 y 1.5 solo necesitan un plan. La 1.4 usa un
  --     segundo si existe; si no, recurre a un UUID sintetico.
  SELECT id INTO v_plan FROM public.web_funnel_plans ORDER BY created_at, id LIMIT 1;
  IF v_plan IS NULL THEN
    RAISE NOTICE 'SKIP: web_funnel_plans esta vacia; crea un funnel de prueba o ajusta el script.';
    RETURN;
  END IF;

  SELECT id INTO v_plan2 FROM public.web_funnel_plans
   WHERE id <> v_plan ORDER BY created_at, id LIMIT 1;

  -- 1.1 INSERT base -> debe funcionar
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'FALLO 1.1: el insert base fue rechazado: %', SQLERRM;
  END;

  -- 1.2 Mismo (scope, transaction_id) -> 23505
  --     Una compra no puede asociarse dos veces dentro del mismo scope.
  --     Concreto incluso usando el mismo plan: el indice UNIQUE se evalua antes
  --     que la FK, asi que el 23505 no puede venir de otra causa.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-1', 'tx-verify-origin-2', v_user, v_plan);
    RAISE EXCEPTION 'FALLO 1.2: se permitio duplicar transaction_id en el mismo scope';
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
    RAISE EXCEPTION 'FALLO 1.3: se permitio reutilizar original_transaction_id en el mismo scope';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 1.3: original_transaction_id duplicado rechazado (23505)';
  END;

  -- 1.4 UPDATE de plan_id -> el trigger debe rechazarlo
  --     IMPORTANTE: el valor asignado debe ser DISTINTO del actual. Asignar el
  --     mismo plan no activaria NEW.plan_id IS DISTINCT FROM OLD.plan_id y la
  --     prueba no probaria nada. Por eso:
  --       a) con segundo plan real: la FK valida, el trigger es lo UNICO que
  --          puede rechazar -> concluyente al 100%.
  --       b) sin segundo plan: UUID sintetico. El trigger BEFORE UPDATE actua
  --          antes que la FK; se distingue el caso por si algo mas rechazara.
  IF v_plan2 IS NOT NULL THEN
    BEGIN
      UPDATE public.revenuecat_purchase_plans
         SET plan_id = v_plan2
       WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
      RAISE EXCEPTION 'FALLO 1.4a: se permitio mover plan_id a otro plan real';
    EXCEPTION WHEN integrity_constraint_violation THEN
      RAISE NOTICE 'OK 1.4a: plan_id rechazado por el trigger (2o plan real; concluyente)';
    END;
  ELSE
    BEGIN
      UPDATE public.revenuecat_purchase_plans
         SET plan_id = gen_random_uuid()
       WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
      RAISE EXCEPTION 'FALLO 1.4b: se permitio mover plan_id';
    EXCEPTION
      WHEN integrity_constraint_violation THEN
        RAISE NOTICE 'OK 1.4b: plan_id rechazado por el trigger (UUID sintetico)';
      WHEN foreign_key_violation THEN
        -- Inconcluyente: la FK salto antes que el trigger. Hace falta un
        -- segundo plan real en web_funnel_plans para cerrar la prueba.
        RAISE EXCEPTION 'INCONCLUYENTE 1.4b: la FK rechazo antes que el trigger; crea un segundo plan y repite';
    END;
  END IF;

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
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'FALLO 1.5: NULL en original_transaction_id colisiona: %', SQLERRM;
  END;

  -- 1.6 Mismo transaction_id en OTRO scope -> debe permitirse
  --     Sandbox y produccion son compras distintas.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_other, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'FALLO 1.6: no se permitio el mismo transaction_id en otro scope: %', SQLERRM;
  END;

  -- 1.7 Recuento final dentro de la transaccion (esperado 4).
  SELECT count(*) INTO v_rows
    FROM public.revenuecat_purchase_plans WHERE scope_key LIKE 'app-verify%';
  RAISE NOTICE 'OK 1.7: filas creadas en la transaccion = % (esperado 4)', v_rows;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Deshacer TODO
-- ────────────────────────────────────────────────────────────────────────────
ROLLBACK;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Confirmacion: no debe quedar nada
--    Expectado: leaked_rows = 0
-- ────────────────────────────────────────────────────────────────────────────
SELECT count(*) AS leaked_rows
  FROM public.revenuecat_purchase_plans
 WHERE scope_key LIKE 'app-verify%';
