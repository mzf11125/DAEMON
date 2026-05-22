package testutil

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

func applyPostgresMigration(ctx context.Context, pgURL, sqlPath string) error {
	b, err := os.ReadFile(sqlPath)
	if err != nil {
		return err
	}
	pool, err := pgxpool.New(ctx, pgURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	_, err = pool.Exec(ctx, string(b))
	return err
}

func applyClickHouseMigration(ctx context.Context, dsn, sqlPath string) error {
	b, err := os.ReadFile(sqlPath)
	if err != nil {
		return err
	}
	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return err
	}
	conn, err := clickhouse.Open(opts)
	if err != nil {
		return err
	}
	defer conn.Close()
	for _, stmt := range splitClickHouseStatements(string(b)) {
		if err := conn.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("%w\nstatement: %s", err, truncateStmt(stmt))
		}
	}
	return nil
}

// splitClickHouseStatements splits migration files; ClickHouse HTTP/native drivers reject multi-statement Exec.
func splitClickHouseStatements(sql string) []string {
	var out []string
	for _, part := range strings.Split(sql, ";") {
		stmt := strings.TrimSpace(part)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}
		out = append(out, stmt)
	}
	return out
}

func truncateStmt(s string) string {
	const max = 120
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// EnsureDemoTenant inserts tenant-demo for FK-backed integration tests (no Neo4j required).
func EnsureDemoTenant(ctx context.Context, pgURL string) error {
	pool, err := pgxpool.New(ctx, pgURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	_, err = pool.Exec(ctx, `INSERT INTO tenants (tenant_id, name) VALUES ('tenant-demo', 'Demo Manufacturing Co') ON CONFLICT DO NOTHING`)
	return err
}

// RunSeed executes infra/seed against the given env.
func RunSeed(ctx context.Context, env *Env) error {
	cmd := exec.CommandContext(ctx, "go", "run", ".")
	cmd.Dir = filepath.Join(env.RepoRoot, "infra", "seed")
	cmd.Env = append(os.Environ(),
		"DATABASE_URL="+env.PostgresURL,
		"CLICKHOUSE_DSN="+env.ClickHouseDSN,
		"NEO4J_URI="+env.Neo4jURI,
		"NEO4J_USER="+env.Neo4jUser,
		"NEO4J_PASSWORD="+env.Neo4jPassword,
		"SKIP_NEO4J_SEED=1",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("seed: %w: %s", err, string(out))
	}
	return nil
}
