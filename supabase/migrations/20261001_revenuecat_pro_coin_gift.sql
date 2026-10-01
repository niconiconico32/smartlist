-- Pro purchase coin gift + additive achievement sync.
-- Prepared only: apply manually after reviewing; never use db push globally.

CREATE TABLE IF NOT EXISTS public.revenuecat_pro_coin_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT,
  app_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 10000 CHECK (coins > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT revenuecat_pro_coin_grants_scope_tx_uniq
    UNIQUE (scope_key, transaction_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS revenuecat_pro_coin_grants_event_uniq
  ON public.revenuecat_pro_coin_grants (event_id);

ALTER TABLE public.revenuecat_pro_coin_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.revenuecat_pro_coin_grants
  FROM anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.revenuecat_pro_coin_grants TO service_role;

-- Adds a delta to the server balance while merging the rest of the client
-- snapshot. The client must send the delta since its last cloud baseline;
-- absolute totalCoins values are never allowed to overwrite concurrent gifts.
CREATE OR REPLACE FUNCTION public.merge_user_achievements(
  p_data JSONB,
  p_coin_delta INTEGER DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_total INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.user_achievements (user_id, data)
  VALUES (
    v_user,
    jsonb_set(COALESCE(p_data, '{}'::jsonb), '{totalCoins}',
      to_jsonb(GREATEST(0, COALESCE(p_coin_delta, 0))), true)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET data = jsonb_set(
    COALESCE(EXCLUDED.data, '{}'::jsonb),
    '{totalCoins}',
    to_jsonb(GREATEST(0,
      COALESCE((public.user_achievements.data->>'totalCoins')::INTEGER, 0)
      + COALESCE(p_coin_delta, 0)
    )),
    true
  );

  SELECT COALESCE((data->>'totalCoins')::INTEGER, 0)
    INTO v_total
    FROM public.user_achievements
   WHERE user_id = v_user;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_user_achievements(JSONB, INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_user_achievements(JSONB, INTEGER)
  TO authenticated;

-- Idempotently grants the one-time 10,000-coin Pro purchase reward. The unique
-- transaction key means retries, duplicate webhook deliveries, and a client
-- re-run cannot grant the reward twice.
CREATE OR REPLACE FUNCTION public.grant_revenuecat_pro_coin_gift(
  p_scope_key TEXT,
  p_transaction_id TEXT,
  p_original_transaction_id TEXT,
  p_app_user_id UUID,
  p_event_id TEXT
)
RETURNS TABLE(granted BOOLEAN, total_coins INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted UUID;
  v_total INTEGER;
BEGIN
  IF p_scope_key IS NULL OR p_scope_key = ''
     OR p_transaction_id IS NULL OR p_transaction_id = ''
     OR p_app_user_id IS NULL OR p_event_id IS NULL OR p_event_id = '' THEN
    RAISE EXCEPTION 'invalid_coin_gift_arguments';
  END IF;

  INSERT INTO public.revenuecat_pro_coin_grants (
    scope_key, transaction_id, original_transaction_id,
    app_user_id, event_id, coins
  )
  VALUES (
    p_scope_key, p_transaction_id, p_original_transaction_id,
    p_app_user_id, p_event_id, 10000
  )
  ON CONFLICT (scope_key, transaction_id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT COALESCE((data->>'totalCoins')::INTEGER, 0)
      INTO v_total
      FROM public.user_achievements
     WHERE user_id = p_app_user_id;
    RETURN QUERY SELECT false, COALESCE(v_total, 0);
    RETURN;
  END IF;

  INSERT INTO public.user_achievements (user_id, data)
  VALUES (
    p_app_user_id,
    jsonb_build_object('totalCoins', 10000)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET data = jsonb_set(
    COALESCE(public.user_achievements.data, '{}'::jsonb),
    '{totalCoins}',
    to_jsonb(COALESCE((public.user_achievements.data->>'totalCoins')::INTEGER, 0) + 10000),
    true
  );

  SELECT COALESCE((data->>'totalCoins')::INTEGER, 0)
    INTO v_total
    FROM public.user_achievements
   WHERE user_id = p_app_user_id;
  RETURN QUERY SELECT true, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_revenuecat_pro_coin_gift(TEXT, TEXT, TEXT, UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_revenuecat_pro_coin_gift(TEXT, TEXT, TEXT, UUID, TEXT)
  TO service_role;
