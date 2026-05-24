package testutil

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/clickhouse"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// Env holds connection strings for integration tests.
type Env struct {
	PostgresURL   string
	ClickHouseDSN string
	Neo4jURI      string
	Neo4jUser     string
	Neo4jPassword string
	RepoRoot      string
	pgContainer   testcontainers.Container
	chContainer   testcontainers.Container
	neoContainer  testcontainers.Container
}

func integrationUseLocal() bool {
	v := os.Getenv("INTEGRATION_USE_LOCAL")
	return v == "1" || v == "true"
}

func dockerAvailable() bool {
	return exec.Command("docker", "info").Run() == nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireLocalTCP(name, addr string) error {
	conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
	if err != nil {
		return fmt.Errorf("%s (%s): %w", name, addr, err)
	}
	_ = conn.Close()
	return nil
}

// SetupDataStores starts Postgres, ClickHouse, and Neo4j (containers or local stack) and applies SQL migrations.
func SetupDataStores(ctx context.Context, t *testing.T) *Env {
	t.Helper()
	repoRoot, err := findRepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	if integrationUseLocal() {
		return setupLocalDataStores(ctx, t, repoRoot)
	}
	if !dockerAvailable() {
		t.Skip("Docker unavailable for testcontainers; start Docker Desktop or set INTEGRATION_USE_LOCAL=1 with `make up`, `make supabase-up`, and `make migrate`")
	}
	return setupContainerDataStores(ctx, t, repoRoot)
}

func setupLocalDataStores(ctx context.Context, t *testing.T, repoRoot string) *Env {
	t.Helper()
	pgURL := envOr("INTEGRATION_POSTGRES_URL", envOr("SEED_DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable"))
	chDSN := envOr("INTEGRATION_CLICKHOUSE_DSN", envOr("CLICKHOUSE_DSN", "clickhouse://daemon:daemon@127.0.0.1:9000/daemon"))
	neoURI := envOr("INTEGRATION_NEO4J_URI", envOr("NEO4J_URI", "neo4j://127.0.0.1:7687"))
	pgHost := envOr("INTEGRATION_PG_HOST", "127.0.0.1")
	pgPort := envOr("INTEGRATION_PG_PORT", "54332")
	chHost := envOr("INTEGRATION_CH_HOST", "127.0.0.1")
	chPort := envOr("INTEGRATION_CH_PORT", "9000")
	pgAddr := net.JoinHostPort(pgHost, pgPort)
	chAddr := net.JoinHostPort(chHost, chPort)
	if pgErr := requireLocalTCP("Postgres", pgAddr); pgErr != nil {
		t.Skip("INTEGRATION_USE_LOCAL=1 but local stack not ready: " + pgErr.Error() + " — run: ./scripts/bootstrap-integration-local.sh")
	}
	if chErr := requireLocalTCP("ClickHouse", chAddr); chErr != nil {
		t.Skip("INTEGRATION_USE_LOCAL=1 but local stack not ready: " + chErr.Error() + " — run: make up (after Docker Desktop is running)")
	}
	env := &Env{
		PostgresURL:   pgURL,
		ClickHouseDSN: chDSN,
		Neo4jURI:      neoURI,
		Neo4jUser:     envOr("NEO4J_USER", "neo4j"),
		Neo4jPassword: envOr("NEO4J_PASSWORD", "daemonneo4j"),
		RepoRoot:      repoRoot,
	}
	applyDataStoreMigrations(ctx, t, env)
	return env
}

func setupContainerDataStores(ctx context.Context, t *testing.T, repoRoot string) *Env {
	t.Helper()
	pgC, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("daemon"),
		postgres.WithUsername("daemon"),
		postgres.WithPassword("daemon"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").WithOccurrence(2).WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("postgres container: %v", err)
	}
	pgURL, err := pgC.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("postgres conn: %v", err)
	}

	chC, err := clickhouse.Run(ctx,
		"clickhouse/clickhouse-server:24.8",
		clickhouse.WithUsername("daemon"),
		clickhouse.WithPassword("daemon"),
		clickhouse.WithDatabase("daemon"),
	)
	if err != nil {
		t.Fatalf("clickhouse container: %v", err)
	}
	chHost, err := chC.Host(ctx)
	if err != nil {
		t.Fatalf("clickhouse host: %v", err)
	}
	chPort, err := chC.MappedPort(ctx, "9000/tcp")
	if err != nil {
		t.Fatalf("clickhouse port: %v", err)
	}
	chDSN := fmt.Sprintf("clickhouse://daemon:daemon@%s:%s/daemon", chHost, chPort.Port())

	neoURI := "neo4j://127.0.0.1:7687"
	var neoC testcontainers.Container
	if os.Getenv("INTEGRATION_WITH_NEO4J") == "1" || os.Getenv("INTEGRATION_WITH_NEO4J") == "true" {
		neoC, err = testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
			ContainerRequest: testcontainers.ContainerRequest{
				Image:        "neo4j:5.26-community",
				ExposedPorts: []string{"7687/tcp"},
				Env: map[string]string{
					"NEO4J_AUTH": "neo4j/daemonneo4j",
				},
				WaitingFor: wait.ForLog("Started."),
			},
			Started: true,
		})
		if err != nil {
			t.Fatalf("neo4j container: %v", err)
		}
		neoHost, err := neoC.Host(ctx)
		if err != nil {
			t.Fatalf("neo4j host: %v", err)
		}
		neoPort, err := neoC.MappedPort(ctx, "7687/tcp")
		if err != nil {
			t.Fatalf("neo4j port: %v", err)
		}
		neoURI = fmt.Sprintf("neo4j://%s:%s", neoHost, neoPort.Port())
	}

	env := &Env{
		PostgresURL:   pgURL,
		ClickHouseDSN: chDSN,
		Neo4jURI:      neoURI,
		Neo4jUser:     "neo4j",
		Neo4jPassword: "daemonneo4j",
		RepoRoot:      repoRoot,
		pgContainer:   pgC,
		chContainer:   chC,
		neoContainer:  neoC,
	}
	applyDataStoreMigrations(ctx, t, env)
	return env
}

func applyDataStoreMigrations(ctx context.Context, t *testing.T, env *Env) {
	t.Helper()
	repoRoot := env.RepoRoot
	pgURL := env.PostgresURL
	chDSN := env.ClickHouseDSN

	if err := applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/001_init.sql")); err != nil {
		t.Fatalf("postgres migration: %v", err)
	}
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/002_indexes_fk.sql"))
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/003_ingestion_params.sql"))
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/004_supabase_compat_roles.sql"))
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/005_authenticated_grants.sql"))
	if err := applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/006_p3_geo_attachments.sql")); err != nil {
		t.Fatalf("postgres migration 006: %v", err)
	}
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/007_market_intel_pgvector.sql"))
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/008_action_proposals.sql"))
	if err := applyClickHouseMigration(ctx, chDSN, filepath.Join(repoRoot, "infra/migrations/clickhouse/001_init.sql")); err != nil {
		t.Fatalf("clickhouse migration: %v", err)
	}
	_ = applyClickHouseMigration(ctx, chDSN, filepath.Join(repoRoot, "infra/migrations/clickhouse/002_tenant_observations.sql"))
	if err := EnsureDemoTenant(ctx, pgURL); err != nil {
		t.Fatalf("demo tenant: %v", err)
	}
}

// Cleanup terminates containers.
func (e *Env) Cleanup(ctx context.Context) {
	if e.pgContainer != nil {
		_ = e.pgContainer.Terminate(ctx)
	}
	if e.chContainer != nil {
		_ = e.chContainer.Terminate(ctx)
	}
	if e.neoContainer != nil {
		_ = e.neoContainer.Terminate(ctx)
	}
}

func findRepoRoot() (string, error) {
	if v := os.Getenv("REPO_ROOT"); v != "" {
		return v, nil
	}
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.work")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("go.work not found")
		}
		dir = parent
	}
}
