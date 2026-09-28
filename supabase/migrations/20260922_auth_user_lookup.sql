-- Server-side email lookup for funnel preparation.
-- Avoids exposing auth.users through PostgREST and avoids listUsers pagination.
CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = auth, public, pg_temp
AS $$
  SELECT u.id, u.email::TEXT
  FROM auth.users AS u
  WHERE lower(u.email) = lower(trim(p_email))
  ORDER BY u.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_auth_user_by_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(TEXT) TO service_role;
