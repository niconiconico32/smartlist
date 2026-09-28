-- Part 2: purchased funnel plans remain recoverable after expires_at.
-- This only replaces the already-canonical claim function body; it does not
-- recreate or alter Part 1 identity columns.
DO $$
DECLARE
  function_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO function_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'claim_funnel_plan'
    AND pg_get_function_identity_arguments(p.oid) =
        'p_claim_token_hash text, p_user_id uuid, p_activities jsonb, p_routines jsonb'
  LIMIT 1;

  IF function_definition IS NULL THEN
    RAISE EXCEPTION 'canonical claim_funnel_plan(uuid identity) was not found';
  END IF;

  IF position('SECURITY DEFINER' IN upper(function_definition)) = 0
      OR position('search_path' IN function_definition) = 0
      OR position('public' IN function_definition) = 0
      OR position('pg_temp' IN function_definition) = 0
     OR position('IF v_plan.expires_at IS NOT NULL AND v_plan.expires_at < NOW() THEN' IN function_definition) = 0
  THEN
    RAISE EXCEPTION 'claim_funnel_plan definition differs from the expected canonical function';
  END IF;

  function_definition := replace(
    function_definition,
    'IF v_plan.expires_at IS NOT NULL AND v_plan.expires_at < NOW() THEN',
    'IF v_plan.purchase_confirmed_at IS NULL AND v_plan.expires_at IS NOT NULL AND v_plan.expires_at < NOW() THEN'
  );

  EXECUTE function_definition;
END
$$;

-- pg_get_functiondef returns CREATE OR REPLACE FUNCTION. Because this migration
-- does not REVOKE/GRANT, the canonical function privileges remain unchanged.
