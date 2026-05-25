//go:build integration

package archiver_test

import (
	"context"
	"os"
	"testing"
	"time"

	gcaudit "github.com/daemon-platform/daemon/packages/go-common/audit"
	"github.com/daemon-platform/daemon/pipelines/audit-archival/internal/archiver"
	"github.com/jackc/pgx/v5/pgxpool"
)

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func TestRunnerDryRunDoesNotMarkArchived(t *testing.T) {
	seedDSN := envOr("SEED_DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, seedDSN)
	if err != nil {
		t.Skipf("postgres not available: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		t.Skipf("postgres not reachable: %v", err)
	}

	const tenantID = "tenant-audit-archival-dry"
	eventID := insertTestAuditRow(t, ctx, pool, tenantID)
	t.Cleanup(cleanupTenant(t, pool, tenantID))

	runner := archiver.NewRunner(
		archiver.NewPostgresReader(pool),
		archiver.LogWriter{},
		archiver.NewPostgresBatchRecorder(pool),
		archiver.Config{TenantID: tenantID, DryRun: true, ArchiveBucket: "test-bucket", BatchLimit: 100},
	)
	if err := runner.Run(ctx); err != nil {
		t.Fatalf("dry-run: %v", err)
	}

	var archived bool
	if err := pool.QueryRow(ctx, `SELECT archived FROM audit_log WHERE event_id::text = $1`, eventID).Scan(&archived); err != nil {
		t.Fatalf("read archived: %v", err)
	}
	if archived {
		t.Fatal("dry-run must not set archived=true")
	}
}

func TestRunnerArchivesRowAndInsertsBatch(t *testing.T) {
	seedDSN := envOr("SEED_DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable")
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, seedDSN)
	if err != nil {
		t.Skipf("postgres not available: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		t.Skipf("postgres not reachable: %v", err)
	}

	const tenantID = "tenant-audit-archival-live"
	eventID := insertTestAuditRow(t, ctx, pool, tenantID)
	t.Cleanup(cleanupTenant(t, pool, tenantID))

	runner := archiver.NewRunner(
		archiver.NewPostgresReader(pool),
		archiver.LogWriter{},
		archiver.NewPostgresBatchRecorder(pool),
		archiver.Config{TenantID: tenantID, DryRun: false, ArchiveBucket: "test-bucket", BatchLimit: 100},
	)
	if err := runner.Run(ctx); err != nil {
		t.Fatalf("archival: %v", err)
	}

	var archived bool
	if err := pool.QueryRow(ctx, `SELECT archived FROM audit_log WHERE event_id::text = $1`, eventID).Scan(&archived); err != nil {
		t.Fatalf("read archived: %v", err)
	}
	if !archived {
		t.Fatal("expected archived=true after successful run")
	}

	var n int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_archive_batches WHERE tenant_id = $1 AND event_class = $2`,
		tenantID, "security").Scan(&n); err != nil {
		t.Fatalf("count batches: %v", err)
	}
	if n < 1 {
		t.Fatalf("expected batch row, got %d", n)
	}
}

func insertTestAuditRow(t *testing.T, ctx context.Context, pool *pgxpool.Pool, tenantID string) string {
	t.Helper()
	_, _ = pool.Exec(ctx, `INSERT INTO tenants (tenant_id, name) VALUES ($1, $2) ON CONFLICT (tenant_id) DO NOTHING`,
		tenantID, "audit archival test")

	class := gcaudit.EventClass("auth.login")
	if class != "security" {
		t.Fatalf("EventClass(auth.login)=%q", class)
	}

	var eventID string
	err := pool.QueryRow(ctx, `
INSERT INTO audit_log (tenant_id, actor_id, action_type, resource_type, resource_id, payload, event_class, archived)
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, false)
RETURNING event_id::text`,
		tenantID, "integration-test", "auth.login", "case", "case-1", `{"integration":true}`, class,
	).Scan(&eventID)
	if err != nil {
		t.Fatalf("insert audit_log (migration 009 applied?): %v", err)
	}
	return eventID
}

func cleanupTenant(t *testing.T, pool *pgxpool.Pool, tenantID string) func() {
	return func() {
		c, _ := context.WithTimeout(context.Background(), 5*time.Second)
		_, _ = pool.Exec(c, `DELETE FROM audit_archive_batches WHERE tenant_id = $1`, tenantID)
		_, _ = pool.Exec(c, `DELETE FROM audit_log WHERE tenant_id = $1`, tenantID)
	}
}
