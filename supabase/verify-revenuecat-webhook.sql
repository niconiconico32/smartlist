-- ============================================================================
-- Verificación MANUAL de revenuecat_webhook (Supabase SQL Editor)
-- ============================================================================
-- NO ejecutar automáticamente. Este script SOLO LEE del estado del proyecto y,
-- en la sección 3, crea filas de prueba dentro de una transacción que se
-- revierte (ROLLBACK) al final: nada queda persistido.
--
-- Orden sugerido:
--   1) Ejecutar 1 y 2 (solo lectura) → confirmar que la migración está aplicada.
--   2) Ejecutar 3 (ROLLBACK) → validar las restricciones sin dejar rastro.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. ¿Están las columnas de lease y existe la tabla de asociación?
--    Esperado tras aplicar la migración: lease=3, assoc=1
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'revenuecat_webhook_events'
       AND column_name IN ('execution_id', 'lease_expires_at')) AS lease_cols,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_name = 'revenuecat_purchase_plans')             AS assoc_table;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Restricciones e índices reales (la garantía NO está en el código)
--    Esperado: 1 constraint (scope_tx_uniq) + 2 unique indexes
--              (scope_orig_uniq, revenuecat_purchase_plans_pkey)
-- ────────────────────────────────────────────────────────────────────────────
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conrelid = 'public.revenuecat_purchase_plans'::regclass
 ORDER BY contype, conname;

SELECT indexname, indexdef
  FROM pg_indexes
 WHERE tablename = 'revenuecat_purchase_plans'
 ORDER BY indexname;

-- Trigger de inmutabilidad de plan_id. Esperado: 1 fila.
SELECT tgname, pg_get_triggerdef(oid) AS definition
  FROM pg_trigger
 WHERE tgrelid = 'public.revenuecat_purchase_plans'::regclass
   AND NOT tgisinternal;

-- Permisos: el cliente NUNCA debe poder UPDATE/DELETE.
-- Esperado: anon/authenticated sin privilegios; service_role con SELECT, INSERT.
SELECT grantee, privilege_type
  FROM information_schema.table_privileges
 WHERE table_name = 'revenuecat_purchase_plans'
 ORDER BY grantee, privilege_type;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Prueba de las restricciones dentro de una transacción con ROLLBACK.
--    Cada bloque debe fallar con 23505 (unique_violation) o
--    integrity_constraint_violation. Nada se persiste.
-- ────────────────────────────────────────────────────────────────────────────
BEGIN;

-- Necesario: la tabla exige un plan real (FK). Se toma uno existente o se
-- aborta este bloque si no hay ninguno.
DO $$
DECLARE
  v_plan  UUID;
  v_plan2 UUID;
  v_user  UUID := '550e8400-e29b-41d4-a716-446655440000';
  v_scope TEXT := 'app-verify|stripe|production';
BEGIN
  SELECT id INTO v_plan FROM public.web_funnel_plans WHERE funnel_user_id = v_user LIMIT 1;
  IF v_plan IS NULL THEN
    RAISE NOTICE 'SKIP: no hay plan con funnel_user_id=% — aborta el test 3', v_user;
    RETURN;
  END IF;
  SELECT id INTO v_plan2 FROM public.web_funnel_plans
   WHERE funnel_user_id = v_user AND id <> v_plan LIMIT 1;

  -- 3.1 INSERT base (debe funcionar)
  INSERT INTO public.revenuecat_purchase_plans
    (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
  VALUES
    (v_scope, 'tx-verify-1', 'tx-verify-origin', v_user, v_plan);

  -- 3.2 Mismo (scope, transaction_id) con OTRO plan → debe fallar 23505
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-1', 'tx-verify-origin-2', v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'FALLO 3.2: se permitió duplicar transaction_id en el mismo scope';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 3.2: transaction_id duplicado rechazado (23505)';
  END;

  -- 3.3 Mismo (scope, original_transaction_id) con OTRO plan → debe fallar 23505
  --     Esto es la garantía clave: una renovación no puedearse a otro plan.
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-2', 'tx-verify-origin', v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'FALLO 3.3: se permitió reutilizar original_transaction_id';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK 3.3: original_transaction_id duplicado rechazado (23505)';
  END;

  -- 3.4 UPDATE de plan_id → debe fallar por el trigger
  BEGIN
    UPDATE public.revenuecat_purchase_plans
       SET plan_id = COALESCE(v_plan2, v_plan)
     WHERE scope_key = v_scope AND transaction_id = 'tx-verify-1';
    RAISE NOTICE 'FALLO 3.4: se permitió mover plan_id';
  EXCEPTION WHEN integrity_constraint_violation THEN
    RAISE NOTICE 'OK 3.4: plan_id inmutable rechazado por trigger';
  END;

  -- 3.5 NULL en original_transaction_id NO colisiona (índice parcial)
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-3', NULL, v_user, COALESCE(v_plan2, v_plan));
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-verify-4', NULL, v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'OK 3.5: NULL original_transaction_id no colisiona (índice parcial)';
  END;

  -- 3.6 Mismo transaction_id en OTRO scope → debe permitirse
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      ('app-verify|stripe|sandbox', 'tx-verify-1', 'tx-verify-origin', v_user, COALESCE(v_plan2, v_plan));
    RAISE NOTICE 'OK 3.6: mismo transaction_id en otro scope permitido';
  END;

  -- 3.7 Lo que quedó dentro de la transacción (debe haber 4 filas)
  SELECT count(*) AS rows_in_tx FROM public.revenuecat_purchase_plans WHERE scope_key LIKE 'app-verify%';
END $$;

-- 3.8 Descartar TODO lo insertado en el paso 3
ROLLBACK;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Confirmación post-ROLLBACK: no debe quedar nada
--    Esperado: 0
-- ────────────────────────────────────────────────────────────────────────────
SELECT count(*) AS leaked_rows
  FROM public.revenuecat_purchase_plans
 WHERE scope_key LIKE 'app-verify%';
