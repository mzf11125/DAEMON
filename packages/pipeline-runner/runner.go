package pipelinerunner

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/daemon-platform/daemon/packages/dune-ingest/analytics"
	"github.com/daemon-platform/daemon/packages/dune-ingest/ingestparams"
	"github.com/daemon-platform/daemon/packages/dune-ingest/sim"
)

// Config drives pipeline execution paths and stores.
type Config struct {
	ClickHouseDSN string
	RepoRoot      string
	TenantID      string
}

// RunConnector runs the pipeline chain for a known connector id.
func RunConnector(ctx context.Context, cfg Config, connector string, params json.RawMessage) error {
	if cfg.TenantID != "" {
		_ = os.Setenv("TENANT_ID", cfg.TenantID)
	}
	switch connector {
	case "seed-csv", "":
		return RunSeedCSV(ctx, cfg)
	case "ais-demo":
		return RunAISDemo(ctx, cfg, params)
	case "sim-dune", "dune-sql":
		duneCfg := ingestparams.RunConfigFromEnv(cfg.ClickHouseDSN)
		var err error
		switch connector {
		case "sim-dune":
			err = sim.Run(ctx, duneCfg, params)
		case "dune-sql":
			err = analytics.Run(ctx, duneCfg, params)
		}
		if err != nil {
			return err
		}
		if err := transforms(ctx, cfg); err != nil {
			return fmt.Errorf("transforms: %w", err)
		}
		if err := features(ctx, cfg); err != nil {
			return fmt.Errorf("features: %w", err)
		}
		if err := quality(ctx, cfg); err != nil {
			return fmt.Errorf("quality: %w", err)
		}
		return nil
	default:
		return fmt.Errorf("unknown connector: %s", connector)
	}
}

// RunSeedCSV runs raw-ingest → transforms → features → quality (same as make pipeline-all).
func RunSeedCSV(ctx context.Context, cfg Config) error {
	if err := rawIngest(ctx, cfg); err != nil {
		return fmt.Errorf("raw-ingest: %w", err)
	}
	if err := transforms(ctx, cfg); err != nil {
		return fmt.Errorf("transforms: %w", err)
	}
	if err := features(ctx, cfg); err != nil {
		return fmt.Errorf("features: %w", err)
	}
	if err := quality(ctx, cfg); err != nil {
		return fmt.Errorf("quality: %w", err)
	}
	return nil
}

func openCH(ctx context.Context, dsn string) (clickhouse.Conn, error) {
	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	return clickhouse.Open(opts)
}

func rawIngest(ctx context.Context, cfg Config) error {
	conn, err := openCH(ctx, cfg.ClickHouseDSN)
	if err != nil {
		return err
	}
	defer conn.Close()

	seedDir := filepath.Join(cfg.RepoRoot, "connectors", "seed-data")
	f := filepath.Join(seedDir, "observations.csv")
	rows, err := readCSV(f)
	if err != nil {
		return err
	}
	batch, err := conn.PrepareBatch(ctx, `INSERT INTO raw_observations (observation_id, asset_id, label, value, unit, observed_at)`)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	for i, row := range rows {
		if i == 0 || len(row) < 5 {
			continue
		}
		val := parseFloat(row[3])
		if err := batch.Append(row[0], row[1], row[2], val, row[4], now); err != nil {
			return err
		}
	}
	return batch.Send()
}

func transforms(ctx context.Context, cfg Config) error {
	conn, err := openCH(ctx, cfg.ClickHouseDSN)
	if err != nil {
		return err
	}
	defer conn.Close()
	tenant := os.Getenv("TENANT_ID")
	if tenant == "" {
		tenant = "tenant-demo"
	}
	q := `INSERT INTO daemon.dataset_observations
	SELECT observation_id, label, value, unit, observed_at, asset_id, observed_at, observed_at, ? AS tenant_id
	FROM daemon.raw_observations`
	return conn.Exec(ctx, q, tenant)
}

func features(ctx context.Context, cfg Config) error {
	conn, err := openCH(ctx, cfg.ClickHouseDSN)
	if err != nil {
		return err
	}
	defer conn.Close()
	q := `INSERT INTO features_asset_daily
	SELECT asset_id, toDate(observed_at) AS day, count() AS observation_count, avg(value) AS avg_value, max(value) AS max_value
	FROM dataset_observations GROUP BY asset_id, day`
	return conn.Exec(ctx, q)
}

func quality(ctx context.Context, cfg Config) error {
	conn, err := openCH(ctx, cfg.ClickHouseDSN)
	if err != nil {
		return err
	}
	defer conn.Close()

	type check struct {
		ID      string `json:"id"`
		SQL     string `json:"sql"`
		MinRows int    `json:"minRows"`
	}
	checksDir := filepath.Join(cfg.RepoRoot, "observability", "checks")
	entries, err := os.ReadDir(checksDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		b, err := os.ReadFile(filepath.Join(checksDir, e.Name()))
		if err != nil {
			return err
		}
		var c check
		if err := json.Unmarshal(b, &c); err != nil {
			return err
		}
		var count uint64
		if err := conn.QueryRow(ctx, c.SQL).Scan(&count); err != nil {
			return fmt.Errorf("check %s: %w", c.ID, err)
		}
		if int(count) < c.MinRows {
			return fmt.Errorf("check %s: row count %d below min %d", c.ID, count, c.MinRows)
		}
	}
	return nil
}

func readCSV(path string) ([][]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return csv.NewReader(f).ReadAll()
}

func parseFloat(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

// ResolveRepoRoot returns REPO_ROOT or the directory containing go.work.
func ResolveRepoRoot() (string, error) {
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
			return "", fmt.Errorf("go.work not found from cwd")
		}
		dir = parent
	}
}
