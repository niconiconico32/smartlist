-- ============================================================================
-- revenuecat-webhook — Gemelo de reporte de las seis pruebas
-- ============================================================================
-- !! ESTE ARCHIVO ESCRIBE DATAS. No lo ejecutes en produccion sin revisar. !!
--
-- Ejecuta EXACTAMENTE las mismas seis pruebas que
--   verify-revenuecat-webhook-writes.sql
-- y anade una cosa: informa del veredicto de cada una.
--
-- Por que existe: un ROLLBACK descarta todo lo transaccional, incluido un SET
-- de sesion y una tabla temporal, y la CLI solo muestra el resultado de la
-- ultima sentencia. Ademas no muestra los RAISE NOTICE. Por tanto, despues de
-- revertir no hay forma de leer los veredictos. Este gemelo los acumula en una
-- cadena y la lanza con RAISE EXCEPTION, que si se ve en la salida.
--
-- Garantia de no persistencia: la excepcion ABORTA la transaccion. Abortar y
-- ejecutar ROLLBACK son equivalentes en cuanto a datos: no se confirma nada, no
-- queda ninguna fila de prueba. El script principal es el que usa la sentencia
-- ROLLBACK explicita.
--
-- Salida esperada: los seis veredictos en OK y
--   "VEREDICTOS 1=OK | 2=OK | 3=OK | 4=OK | 5=OK | 6=OK | filas=4"
-- ============================================================================


BEGIN;

DO $$
DECLARE
  v_plan   UUID;
  v_plan2  UUID;
  v_user   UUID := gen_random_uuid();
  v_scope  TEXT := 'app-verify|stripe|production';
  v_other  TEXT := 'app-verify|stripe|sandbox';
  v_rows   BIGINT;
  v_report TEXT := '';
BEGIN
  SELECT id INTO v_plan FROM public.web_funnel_plans ORDER BY created_at, id LIMIT 1;
  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'VEREDICTOS SKIP: web_funnel_plans esta vacia; no se probo nada';
  END IF;

  SELECT id INTO v_plan2 FROM public.web_funnel_plans
   WHERE id <> v_plan ORDER BY created_at, id LIMIT 1;

  -- 1.1 INSERT base
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);
    v_report := v_report || '1=OK | ';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'VEREDICTOS 1=FALLO insert base rechazado: %', SQLERRM;
  END;

  -- 1.2 transaction_id duplicado -> 23505
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-1', 'tx-verify-origin-2', v_user, v_plan);
    v_report := v_report || '2=FALLO se permitio duplicar transaction_id | ';
  EXCEPTION WHEN unique_violation THEN
    v_report := v_report || '2=OK(23505) | ';
  END;

  -- 1.3 original_transaction_id duplicado -> 23505
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-2', 'tx-verify-origin', v_user, v_plan);
    v_report := v_report || '3=FALLO se permitio reutilizar original_transaction_id | ';
  EXCEPTION WHEN unique_violation THEN
    v_report := v_report || '3=OK(23505) | ';
  END;

  -- 1.4 UPDATE de plan_id -> el trigger debe rechazarlo.
  --     El valor asignado debe ser DISTINTO del actual: asignar el mismo plan no
  --     activaria NEW.plan_id IS DISTINCT FROM OLD.plan_id.
  IF v_plan2 IS NOT NULL THEN
    BEGIN
      UPDATE public.revenuecat_purchase_plans
         SET plan_id = v_plan2
       WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
      v_report := v_report || '4=FALLO se permitio mover plan_id | ';
    EXCEPTION WHEN integrity_constraint_violation THEN
      v_report := v_report || '4=OK(trigger,2o plan) | ';
    END;
  ELSE
    BEGIN
      UPDATE public.revenuecat_purchase_plans
         SET plan_id = gen_random_uuid()
       WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
      v_report := v_report || '4=FALLO se permitio mover plan_id | ';
    EXCEPTION
      WHEN integrity_constraint_violation THEN
        v_report := v_report || '4=OK(trigger,UUID sintetico) | ';
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'VEREDICTOS 4=INCONCLUYENTE la FK rechazo antes que el trigger; crea un segundo plan y repite';
    END;
  END IF;

  -- 1.5 NULL en original_transaction_id no colisiona
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-3', NULL, v_user, v_plan);
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-4', NULL, v_user, v_plan);
    v_report := v_report || '5=OK | ';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'VEREDICTOS 5=FALLO NULL colisiona: %', SQLERRM;
  END;

  -- 1.6 Mismo transaction_id en otro scope -> permitido
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_other, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);
    v_report := v_report || '6=OK | ';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'VEREDICTOS 6=FALLO no se permitio otro scope: %', SQLERRM;
  END;

  SELECT count(*) INTO v_rows
    FROM public.revenuecat_purchase_plans WHERE scope_key LIKE 'app-verify%';

  -- Aborta la transaccion: nada se confirma. El mensaje lleva los veredictos.
  RAISE EXCEPTION 'VEREDICTOS %filas=%', v_report, v_rows;
END $$;
