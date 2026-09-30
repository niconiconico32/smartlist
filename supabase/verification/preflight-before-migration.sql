-- ============================================================================
-- revenuecat-webhook — PREFLIGHT (ejecutable ANTES de la migración)
-- ============================================================================
-- Seguro para ejecutar con la migración sin aplicar.
--
-- Este archivo consulta EXCLUSIVAMENTE catálogos (information_schema y
-- to_regclass) y solo emite booleanos. No contiene ninguna referencia directa a
-- revenuecat_purchase_plans ni a revenuecat_webhook_events como origen de una
-- sentencia, de modo que no puede fallar por tabla inexistente. Verificable con:
--   Select-String -Path este-archivo -Pattern "(FROM|JOIN|INTO|UPDATE)\s+public\."
--   -> debe devolver 0 coincidencias.
--
-- No escribe nada: ni INSERT, UPDATE, DELETE, DDL ni transacciones.
-- ---------------------------------------------------------------------------
-- Uso previsto, en este orden:
--   1) preflight-before-migration.sql        <- este archivo (solo catálogos)
--   2) aplicar la migración a mano
--   3) verify-after-migration-readonly.sql  <- solo lectura
--   4) verify-revenuecat-webhook-writes.sql <- escribe, dentro de ROLLBACK
--
-- El chequeo de duplicados que impediría crear los índices ÚNICOS está en (3),
-- porque solo tiene sentido cuando la tabla ya existe.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. ¿Está ya aplicada la migración? (solo catálogos)
--    Esperado:  applied = false
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'revenuecat_webhook_events'
       AND column_name IN ('execution_id', 'lease_expires_at')) = 2
  AND to_regclass('public.revenuecat_purchase_plans') IS NOT NULL AS applied;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. ¿Existe ya la tabla de asociación?
--    Esperado: null  (la crea la migración)
-- ────────────────────────────────────────────────────────────────────────────
SELECT to_regclass('public.revenuecat_purchase_plans') AS assoc_table;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. ¿Existe la tabla de eventos? Es requisito previo: la migración le hace
--    ALTER TABLE. Si returns false, detente.
--    Esperado: true
-- ────────────────────────────────────────────────────────────────────────────
SELECT to_regclass('public.revenuecat_webhook_events') IS NOT NULL AS events_table_exists;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. Columnas de lease que la migración añadirá
--    Esperado: 0 (todavía no existen)
-- ────────────────────────────────────────────────────────────────────────────
SELECT count(*) AS lease_cols_present
  FROM information_schema.columns
 WHERE table_name = 'revenuecat_webhook_events'
   AND column_name IN ('execution_id', 'lease_expires_at');


-- ────────────────────────────────────────────────────────────────────────────
-- 5. Índices de la asociación que la migración creará
--    pg_indexes es un catálogo, así que responde aunque la tabla no exista.
--    Esperado: 0 filas (todavía no están)
-- ────────────────────────────────────────────────────────────────────────────
SELECT indexname
  FROM pg_indexes
 WHERE indexname IN (
   'revenuecat_purchase_plans_pkey',
   'revenuecat_purchase_plans_scope_tx_uniq',
   'revenuecat_purchase_plans_scope_orig_uniq'
 );


-- ────────────────────────────────────────────────────────────────────────────
-- 6. Trigger de inmutabilidad que la migración creará
--    pg_trigger es un catálogo: no requiere que exista la tabla.
--    Esperado: 0 filas
-- ────────────────────────────────────────────────────────────────────────────
SELECT tgname
  FROM pg_trigger
 WHERE tgname = 'revenuecat_purchase_plans_immutable_trg';
