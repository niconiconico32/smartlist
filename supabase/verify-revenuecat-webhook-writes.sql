-- ============================================================================
-- revenuecat-webhook — Pruebas de ESCRITURA (revertidas)
-- ============================================================================
-- !! ESTE ARCHIVO ESCRIBE DATOS. No lo ejecutes en producción sin revisar. !!
--
-- Todo ocurre dentro de un BEGIN ... ROLLBACK: las filas de prueba se
-- deshacen al final y no queda rastro (verifica con la consulta 4).
--
-- Antes de ejecutarlo, comprueba con el archivo hermano de solo lectura que
-- la migración está aplicada y que el pre-flight de duplicados sale limpio:
--   supabase/verify-revenuecat-webhook-readonly.sql
--
-- Cada sub-bloque captura la excepción esperada y emite un NOTICE con el
-- veredicto. Todos deben decir "OK"; un "FALLO" significa que la garantía
-- que se cree tener NO está en la base de datos.
-- ============================================================================


BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Las 6 pruebas de restricción
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_plan  UUID;
  v_plan2 UUID;
  v_user  UUID := '550e8400-e29b-41d4-a716-446655440000';
  v_scope TEXT := 'app-verify|stripe|production';
BEGIN
  -- La tabla exige plan real (FK). Se toma uno del usuario de prueba.
  SELECT id INTO v_plan FROM public.web_funnel_plans WHERE funnel_user_id = v_user LIMIT 1;
  IF v_plan IS NULL THEN
    RAISE NOTICE 'SKIP: no hay plan con funnel_user_id=% — cambia v_user o crea un funnel de prueba', v_user;
    RETURN;
  END IF;
  SELECT id INTO v_plan2 FROM public.web_funnel_plans
   WHERE funnel_user_id = v_user AND id <> v_plan LIMIT 1;

  IF v_plan2 IS NULL THEN
    RAISE NOTICE 'AVISO: solo hay un plan para el usuario; 3.2/3.3/3.4 usan COALESCE y prueban menos de lo ideal.';
  END IF;

  -- 1.1 INSERT base → debe funcionar
  INSERT INTO public.revenuecat_purchase_plans
    (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
  VALUES
    (v_scope, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);
  RAISE NOTICE 'OK 1.1: insert base aceptado';

  -- 1.2 Mismo (scope, transaction_id) con otro plan → 23505
  --     Una misma compra no puede asociarse dos veces dentro del scope.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-1', 'tx-verify-origin-2', v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'FALLO 1.2: se permitio duplicar transaction_id en el mismo scope';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 1.2: transaction_id duplicado rechazado (23505)';
  END;

  -- 1.3 Mismo (scope, original_transaction_id) con otro plan → 23505
  --     GARANTÍA CLAVE: una renovación nunca puede pegarse a un plan distinto
  --     del de la compra que la originó.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-2', 'tx-verify-origin', v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'FALLO 1.3: se permitio reutilizar original_transaction_id';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 1.3: original_transaction_id duplicado rechazado (23505)';
  END;

  -- 1.4 UPDATE de plan_id → el trigger debe rechazarlo
  --     UNIQUE por sí solo no basta: un UPDATE podría mover la compra.
  BEGIN
    UPDATE public.revenuecat_purchase_plans
       SET plan_id = COALESCE(v_plan2, v_plan)
     WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
    RAISE NOTICE 'FALLO 1.4: se permitio mover plan_id';
  EXCEPTION WHEN integrity_constraint_violation THEN
    RAISE NOTICE 'OK 1.4: plan_id inmutable rechazado por trigger';
  END;

  -- 1.5 NULL en original_transaction_id NO colisiona (índice parcial)
  --     Varias compras nuevas sin origen pueden convivir.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-3', NULL, v_user, COALESCE(v_plan2, v_plan));
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-4', NULL, v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'OK 1.5: NULL original_transaction_id no colisiona (indice parcial)';
  END;

  -- 1.6 Mismo transaction_id en OTRO scope → debe permitirse
  --     Sandbox y producción son compras distintas.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      ('app-verify|stripe|sandbox', 'tx-verify-1', 'tx-verify-origin', v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'OK 1.6: mismo transaction_id en otro scope permitido';
  END;

  -- 1.7 Estado dentro de la transacción: 4 filas (1.1 + 1.5 x2 + 1.6)
  RAISE NOTICE 'Filas en la transaccion (esperado 4): %',
    (SELECT count(*) FROM public.revenuecat_purchase_plans WHERE scope_key LIKE 'app-verify%');
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Lo que quedó insertado, visible antes de revertir
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
-- 4. Confirmación: no debe quedar nada
--    Esperado: leaked_rows = 0
-- ────────────────────────────────────────────────────────────────────────────
SELECT count(*) AS leaked_rows
  FROM public.revenuecat_purchase_plans
 WHERE scope_key LIKE 'app-verify%';
