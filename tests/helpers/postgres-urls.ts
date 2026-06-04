/** Superuser URL for migrations only (compose / CI service default). */
export const POSTGRES_MIGRATE_URL =
  "postgresql://daemon:daemon@127.0.0.1:5432/daemon";

/** Application URL — subject to RLS (use after `pnpm run db:migrate`). */
export const POSTGRES_APP_URL =
  "postgresql://daemon_app:daemon_app@127.0.0.1:5432/daemon";
