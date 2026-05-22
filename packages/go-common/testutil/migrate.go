package testutil

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

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
	return conn.Exec(ctx, string(b))
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
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("seed: %w: %s", err, string(out))
	}
	return nil
}
