-- ============================================================================
-- revenuecat-webhook — Verificación de SOLO LECTURA (DESPUÉS de la migración)
-- ============================================================================
-- Requisito: la migración 20260929_revenuecat_webhook_execution_lease.sql YA
-- está aplicada. Antes de aplicar la migración usa en su lugar:
--   supabase/migrations/preflight-before-migration.sql   (no toca la tabla)
--
-- No escribe nada: ni INSERT, UPDATE, DELETE, DDL ni transacciones.
-- Aquí sí es correcto referenciar revenuecat_purchase_plans directamente,
-- porque a estas alturas la tabla debe existir. La §1 lo confirma: si
-- lease_cols o assoc_table no dan 2 y 1, detente y no sigas.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. Estado de la migración
--    Detente salvo:  lease_cols=2, assoc_table=1
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'revenuecat_webhook_events'
       AND column_name IN ('execution_id', 'lease_expires_at')) AS lease_cols,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_name = 'revenuecat_purchase_plans')             AS assoc_table;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Restricciones
--    Esperado: revenuecat_purchase_plans_pkey (p)
--              revenuecat_purchase_plans_scope_tx_uniq (u)
-- ────────────────────────────────────────────────────────────────────────────
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conrelid = 'public.revenuecat_purchase_plans'::regclass
 ORDER BY contype, conname;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Índices
--    La GARANTÍA de "una compra = un plan" vive aquí, no en el código:
--      - revenuecat_purchase_plans_pkey            UNIQUE (id)
--      - revenuecat_purchase_plans_scope_tx_uniq   UNIQUE (scope_key, transaction_id)
--      - revenuecat_purchase_plans_scope_orig_uniq UNIQUE (scope_key, original_transaction_id)
--        WHERE original_transaction_id IS NOT NULL
--    Si el índice parcial falta, una renovación podría pegarse a otro plan.
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
-- 6. Integridad de los datos existentes
--    Si los índices de la §3 se crearón sin problema, esto saldrá limpio. Es
--    la comprobación que sustituye al pre-flight de duplicados (allí la tabla
--    todavía no existía, así que no se podía consultar).
--    Cualquier fila devuelta es una inconsistencia real.
-- ────────────────────────────────────────────────────────────────────────────
SELECT scope_key, transaction_id, count(*) AS filas
  FROM public.revenuecat_purchase_plans
 GROUP BY scope_key, transaction_id
HAVING count(*) > 1
 ORDER BY scope_key;

SELECT scope_key, original_transaction_id, count(*) AS filas
  FROM public.revenuecat_purchase_plans
 WHERE original_transaction_id IS NOT NULL
 GROUP BY scope_key, original_transaction_id
HAVING count(*) > 1
 ORDER BY scope_key;

SELECT
  count(*)                                                    AS total_rows,
  count(DISTINCT app_user_id)                                 AS distinct_users,
  count(*) FILTER (WHERE original_transaction_id IS NULL)     AS sin_original,
  count(*) FILTER (WHERE original_transaction_id IS NOT NULL) AS con_original
FROM public.revenuecat_purchase_plans;

-- orig_plan_distinct > 1 = un mismo origen ya apunta a varios planes.
-- Inconsistencia que el código no puede arreglar, solo detectar.
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
-- 7. Estado de los eventos
--    processing_vencidos > 0 = entregas claimed que nadie terminó; el handler
--    las reclamará porque su lease expiró. No es un error por sí mismo.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  count(*) FILTER (WHERE status = 'processing')                                AS processing,
  count(*) FILTER (WHERE status = 'processing'
                     AND lease_expires_at IS NOT NULL
                     AND lease_expires_at < now())                            AS processing_vencidos,
  count(*) FILTER (WHERE status = 'retryable')                                 AS retryable,
  count(*) FILTER (WHERE status = 'ignored')                                   AS ignored,
  count(*) FILTER (WHERE status = 'failed')                                    AS failed
FROM public.revenuecat_webhook_events;


-- ────────────────────────────────────────────────────────────────────────────
-- 8. Eventos con scope incompleto (403/503 en vez de terminal)
--    Es de esperar que existan: incomplete_scope es retryable a propósito,
--    para poder recuperarlos cuando se confirme el payload real de RevenueCat.
-- ────────────────────────────────────────────────────────────────────────────
SELECT status, count(*) AS rows
  FROM public.revenuecat_webhook_events
 WHERE type IN ('PURCHASE', 'INITIAL_PURCHASE', 'RENEWAL')
 GROUP BY status
 ORDER BY status;
