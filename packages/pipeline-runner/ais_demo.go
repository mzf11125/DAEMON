package pipelinerunner

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type aisPosition struct {
	AssetID    string  `json:"assetId"`
	MMSI       string  `json:"mmsi"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Label      string  `json:"label"`
	ObservedAt string  `json:"observedAt"`
}

// RunAISDemo ingests AIS-style position snapshots into ClickHouse and updates Asset geo in Postgres when DATABASE_URL is set.
func RunAISDemo(ctx context.Context, cfg Config, params json.RawMessage) error {
	repo := cfg.RepoRoot
	if repo == "" {
		var err error
		repo, err = ResolveRepoRoot()
		if err != nil {
			return err
		}
	}
	path := filepath.Join(repo, "connectors", "ais-demo", "positions.json")
	b, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read ais positions: %w", err)
	}
	var positions []aisPosition
	if err := json.Unmarshal(b, &positions); err != nil {
		return err
	}
	conn, err := openCH(ctx, cfg.ClickHouseDSN)
	if err != nil {
		return err
	}
	defer conn.Close()

	tenant := cfg.TenantID
	if tenant == "" {
		tenant = "tenant-demo"
	}
	batch, err := conn.PrepareBatch(ctx, `INSERT INTO dataset_observations (observation_id, label, value, unit, observed_at, asset_id, created_at, updated_at)`)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	for i, p := range positions {
		ts := now
		if p.ObservedAt != "" {
			if t, err := time.Parse(time.RFC3339, p.ObservedAt); err == nil {
				ts = t.UTC()
			}
		}
		label := p.Label
		if label == "" {
			label = "ais_position"
		}
		obsID := fmt.Sprintf("ais-%s-%d", p.AssetID, i)
		// value stores latitude; unit stores longitude for demo geo observation pair
		if err := batch.Append(obsID, label, p.Latitude, fmt.Sprintf("lon:%f", p.Longitude), ts, p.AssetID, now, now); err != nil {
			return err
		}
	}
	if err := batch.Send(); err != nil {
		return err
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil
	}
	pg, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return fmt.Errorf("postgres: %w", err)
	}
	defer pg.Close()
	last := positions[len(positions)-1]
	propsPatch, _ := json.Marshal(map[string]any{
		"latitude": last.Latitude, "longitude": last.Longitude, "mmsi": last.MMSI,
	})
	_, err = pg.Exec(ctx, `
		UPDATE ontology_objects SET properties = properties || $1::jsonb, updated_at = NOW()
		WHERE tenant_id = $2 AND object_type = 'Asset' AND primary_key_value = $3`,
		string(propsPatch), tenant, last.AssetID)
	return err
}
