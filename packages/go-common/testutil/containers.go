package testutil

import (
	"context"
	"fmt"
	"os"
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

// SetupDataStores starts Postgres, ClickHouse, and Neo4j containers and applies SQL migrations.
func SetupDataStores(ctx context.Context, t *testing.T) *Env {
	t.Helper()
	repoRoot, err := findRepoRoot()
	if err != nil {
		t.Fatal(err)
	}

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

	// Schema migrations as daemon user.
	if err := applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/001_init.sql")); err != nil {
		t.Fatalf("postgres migration: %v", err)
	}
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/002_indexes_fk.sql"))
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/003_ingestion_params.sql"))
	_ = applyPostgresMigration(ctx, pgURL, filepath.Join(repoRoot, "infra/migrations/postgres/004_supabase_compat_roles.sql"))
	if err := applyClickHouseMigration(ctx, chDSN, filepath.Join(repoRoot, "infra/migrations/clickhouse/001_init.sql")); err != nil {
		t.Fatalf("clickhouse migration: %v", err)
	}
	_ = applyClickHouseMigration(ctx, chDSN, filepath.Join(repoRoot, "infra/migrations/clickhouse/002_tenant_observations.sql"))
	if err := EnsureDemoTenant(ctx, pgURL); err != nil {
		t.Fatalf("demo tenant: %v", err)
	}

	return env
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
