-- ============================================================================
-- revenuecat-webhook — Verificación de SOLO LECTURA
-- ============================================================================
-- Seguro para ejecutar en cualquier entorno: no contiene INSERT, UPDATE,
-- DELETE, TRUNCATE, DDL ni transactions. Solo SELECT y catálogos del sistema.
--
-- Úsalo para (a) comprobar si la migración está aplicada y (b) auditar si
-- habría datos que colisionen ANTES de aplicarla.
--
-- Las pruebas que sí escriben datos están en el archivo hermano:
--   supabase/verify-revenuecat-webhook-writes.sql   (no ejecutar aquí)
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. Estado de la migración
--    Esperado si NO aplicada:  lease_cols=0, assoc_table=0
--    Esperado si aplicada:      lease_cols=2, assoc_table=1
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'revenuecat_webhook_events'
       AND column_name IN ('execution_id', 'lease_expires_at')) AS lease_cols,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_name = 'revenuecat_purchase_plans')             AS assoc_table;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Restricciones reales
--    Esperado: revenuecat_purchase_plans_scope_tx_uniq (u)
--              revenuecat_purchase_plans_pkey (p)
-- ────────────────────────────────────────────────────────────────────────────
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conrelid = 'public.revenuecat_purchase_plans'::regclass
 ORDER BY contype, conname;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Índices reales
--    La GARANTÍA de "una compra = un plan" vive aquí, no en el código:
--      - revenuecat_purchase_plans_pkey            UNIQUE (id)
--      - revenuecat_purchase_plans_scope_tx_uniq   UNIQUE (scope_key, transaction_id)
--      - revenuecat_purchase_plans_scope_orig_uniq UNIQUE (scope_key, original_transaction_id)
--        WHERE original_transaction_id IS NOT NULL
--    Si el índice parcial no aparece, la renovación podría pegarse a otro plan.
-- ────────────────────────────────────────────────────────────────────────────
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE tablename = 'revenuecat_purchase_plans'
 ORDER BY indexname;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. Trigger de inmutabilidad
--    Esperado: revenuecat_purchase_plans_immutable_trg BEFORE UPDATE
-- ────────────────────────────────────────────────────────────────────────────
SELECT tgname, pg_get_triggerdef(oid) AS definition
  FROM pg_trigger
 WHERE tgrelid = 'public.revenuecat_purchase_plans'::regclass
   AND NOT tgisinternal;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. Privilegios
--    Esperado: anon/authenticated sin filas; service_role solo
--              SELECT + INSERT (nunca UPDATE ni DELETE).
-- ────────────────────────────────────────────────────────────────────────────
SELECT grantee, privilege_type
  FROM information_schema.table_privileges
 WHERE table_name = 'revenuecat_purchase_plans'
 ORDER BY grantee, privilege_type;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. Pre-flight: ¿aplicar el índice único fallaría por datos existentes?
--    Si la tabla aún no existe no hay nada que colisionar.
--    Si existen, la salida debe ser 0 en ambos grupos: cualquier valor > 0
--    hará fallar CREATE UNIQUE INDEX y la migración no podrá aplicarse.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.revenuecat_purchase_plans') IS NULL THEN
    RAISE NOTICE 'OK: revenuecat_purchase_plans no existe todavia; no hay datos que colisionen.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.revenuecat_purchase_plans
     GROUP BY scope_key, transaction_id HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'ATENCION: hay transaction_id duplicados por scope; la migracion fallara.';
  ELSE
    RAISE NOTICE 'OK: sin duplicados en (scope_key, transaction_id).';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.revenuecat_purchase_plans
     WHERE original_transaction_id IS NOT NULL
     GROUP BY scope_key, original_transaction_id HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'ATENCION: hay original_transaction_id duplicados por scope; la migracion fallara.';
  ELSE
    RAISE NOTICE 'OK: sin duplicados en (scope_key, original_transaction_id).';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 7. Auditoría de la asociación existente
--    orig_plan_distinct > 1 significa que un mismo origen ya apunta a varios
--    planes: inconsistencia que el código no puede arreglar, solo detectar.
--    Solo se ejecuta si la tabla existe.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  count(*)                                                        AS total_rows,
  count(DISTINCT app_user_id)                                     AS distinct_users,
  count(*) FILTER (WHERE original_transaction_id IS NULL)         AS sin_original,
  count(*) FILTER (WHERE original_transaction_id IS NOT NULL)     AS con_original
FROM public.revenuecat_purchase_plans;

SELECT
  scope_key,
  original_transaction_id,
  count(DISTINCT plan_id) AS orig_plan_distinct
FROM public.revenuecat_purchase_plans
WHERE original_transaction_id IS NOT NULL
GROUP BY scope_key, original_transaction_id
HAVING count(DISTINCT plan_id) > 1
ORDER BY scope_key;


-- ────────────────────────────────────────────────────────────────────────────
-- 8. Salud de los leases (informativo)
--    processing_vencidos > 0 indica entregas claimed que nadie terminó;
--    el handler las reclamará. No es un error por sí mismo.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  count(*) FILTER (WHERE status = 'processing')                                  AS processing,
  count(*) FILTER (WHERE status = 'processing'
                     AND lease_expires_at IS NOT NULL
                     AND lease_expires_at < now())                              AS processing_vencidos,
  count(*) FILTER (WHERE status = 'retryable')                                   AS retryable,
  count(*) FILTER (WHERE status = 'failed')                                      AS failed
FROM public.revenuecat_webhook_events;
