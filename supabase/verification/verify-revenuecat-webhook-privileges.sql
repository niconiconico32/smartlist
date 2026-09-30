-- ============================================================================
-- revenuecat-webhook — Pruebas de permisos con SET LOCAL ROLE service_role
-- ============================================================================
-- !! ESTE ARCHIVO ESCRIBE DATAS (una fila de prueba). No lo ejecutes en
--    produccion sin revisar. Todo queda dentro de BEGIN ... ROLLBACK. !!
--
-- Verifica que service_role puede leer e insertar, pero NO puede modificar ni
-- borrar la tabla de asociaciones. El INSERT de prueba se deshace con el
-- ROLLBACK; la seccion 2 lo confirma.
--
-- Si alguna comprobacion NO se cumple, el bloque DO lanza una excepcion y el
-- lote entero falla: no podria pasar inadvertido.
--
-- Requiere que los privileges ya esten corregidos (REVOKE ALL + GRANT SELECT,
-- INSERT). Si service_role conserva UPDATE/DELETE/TRUNCATE, las pruebas 3, 4 y
-- 5 fallaran aqui.
-- ============================================================================


BEGIN;

DO $$
DECLARE
  v_plan   UUID;
  v_user   UUID := gen_random_uuid();
  v_scope  TEXT := 'app-verify-priv|stripe|production';
  v_fallo  TEXT := '';
BEGIN
  -- Plan real para la FK: se captura ANTES de cambiar de rol.
  SELECT id INTO v_plan FROM public.web_funnel_plans ORDER BY created_at, id LIMIT 1;
  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'PERMISOS SKIP: web_funnel_plans esta vacia; no se probo nada';
  END IF;

  -- A partir de aqui las comprobaciones de permisos son las de service_role.
  -- service_role tiene BYPASSRLS, asi que lo que se mide son los GRANT.
  EXECUTE 'SET LOCAL ROLE service_role';

  -- 1. SELECT: debe permitirse
  BEGIN
    PERFORM 1 FROM public.revenuecat_purchase_plans LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN
    v_fallo := v_fallo || ' [1 SELECT rechazado con insufficient_privilege]';
  END;

  -- 2. INSERT con datos validos: debe permitirse
  BEGIN
    INSERT INTO public.revenuecat_purchase_plans
      (scope_key, transaction_id, original_transaction_id, app_user_id, plan_id)
    VALUES
      (v_scope, 'tx-priv-1', 'tx-priv-origin', v_user, v_plan);
  EXCEPTION WHEN insufficient_privilege THEN
    v_fallo := v_fallo || ' [2 INSERT rechazado con insufficient_privilege]';
  END;

  -- 3. UPDATE: debe RECHAZARSE por insufficient_privilege
  BEGIN
    EXECUTE 'UPDATE public.revenuecat_purchase_plans
                SET original_transaction_id = ''tx-priv-tampered''
              WHERE scope_key = ''' || v_scope || '''';
    v_fallo := v_fallo || ' [3 UPDATE permitido; deberia rechazarse]';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- correcto
  END;

  -- 4. DELETE: debe RECHAZARSE por insufficient_privilege
  BEGIN
    EXECUTE 'DELETE FROM public.revenuecat_purchase_plans
              WHERE scope_key = ''' || v_scope || '''';
    v_fallo := v_fallo || ' [4 DELETE permitido; deberia rechazarse]';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- correcto
  END;

  -- 5. TRUNCATE: debe RECHAZARSE por insufficient_privilege
  BEGIN
    EXECUTE 'TRUNCATE public.revenuecat_purchase_plans';
    v_fallo := v_fallo || ' [5 TRUNCATE permitido; deberia rechazarse]';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- correcto
  END;

  IF v_fallo <> '' THEN
    RAISE EXCEPTION 'PERMISOS FALLIDOS:%', v_fallo;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Deshacer TODO (incluye la fila de la prueba 2)
-- ────────────────────────────────────────────────────────────────────────────
ROLLBACK;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Resultado  <-- LEER ESTA SALIDA
--    leaked_rows debe ser 0.
--    allowed=1 significa que service_role tiene el privilegio segun el catalogo;
--    lo esperado es 1 en SELECT/INSERT y 0 en UPDATE/DELETE/TRUNCATE/REFERENCES.
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.revenuecat_purchase_plans
    WHERE scope_key LIKE 'app-verify-priv%')                        AS leaked_rows,
  has_table_privilege('service_role', 'public.revenuecat_purchase_plans', 'SELECT')    AS select_permitido,
  has_table_privilege('service_role', 'public.revenuecat_purchase_plans', 'INSERT')    AS insert_permitido,
  has_table_privilege('service_role', 'public.revenuecat_purchase_plans', 'UPDATE')    AS update_permitido,
  has_table_privilege('service_role', 'public.revenuecat_purchase_plans', 'DELETE')    AS delete_permitido,
  has_table_privilege('service_role', 'public.revenuecat_purchase_plans', 'TRUNCATE')  AS truncate_permitido,
  has_table_privilege('service_role', 'public.revenuecat_purchase_plans', 'REFERENCES') AS references_permitido,
  has_table_privilege('anon',        'public.revenuecat_purchase_plans', 'SELECT')     AS anon_select,
  has_table_privilege('authenticated','public.revenuecat_purchase_plans', 'SELECT')    AS authenticated_select,
  has_table_privilege('postgres',     'public.revenuecat_purchase_plans', 'UPDATE')    AS postgres_update;
