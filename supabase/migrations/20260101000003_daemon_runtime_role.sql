-- Runtime role for Go services: must not bypass RLS (G4b / G5).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daemon_runtime') THEN
    CREATE ROLE daemon_runtime WITH LOGIN PASSWORD 'daemon_runtime_local' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO daemon_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO daemon_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO daemon_runtime;

-- Custom access token hook: inject tenant_id and roles from app_metadata into JWT.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  app_meta jsonb;
BEGIN
  claims := event->'claims';
  app_meta := COALESCE(event->'user'->'app_metadata', '{}'::jsonb);
  IF app_meta ? 'tenant_id' THEN
    claims := jsonb_set(claims, '{tenant_id}', app_meta->'tenant_id', true);
  END IF;
  IF app_meta ? 'roles' THEN
    claims := jsonb_set(claims, '{roles}', app_meta->'roles', true);
  END IF;
  RETURN jsonb_build_object('claims', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO postgres;
