-- Supabase-compatible roles for RLS (SET LOCAL role authenticated) in CI and local Postgres.
DO $$ BEGIN
  CREATE ROLE authenticated;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE anon;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Testcontainers and legacy migrations use user "daemon"; Supabase uses daemon_runtime.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daemon') THEN
    GRANT authenticated TO daemon;
    GRANT anon TO daemon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daemon_runtime') THEN
    GRANT authenticated TO daemon_runtime;
    GRANT anon TO daemon_runtime;
  END IF;
END $$;
