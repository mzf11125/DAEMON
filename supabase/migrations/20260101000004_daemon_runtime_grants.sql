-- Allow Go pool user to SET ROLE for Supabase RLS (G5).
GRANT authenticated TO daemon_runtime;
GRANT anon TO daemon_runtime;
