package bronze

import (
	"context"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"
)

func openCH(ctx context.Context, dsn string) (clickhouse.Conn, error) {
	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	return clickhouse.Open(opts)
}

// Insert batch-inserts normalized rows into daemon.raw_observations.
func Insert(ctx context.Context, dsn string, rows []Row) error {
	if len(rows) == 0 {
		return nil
	}
	conn, err := openCH(ctx, dsn)
	if err != nil {
		return err
	}
	defer conn.Close()

	batch, err := conn.PrepareBatch(ctx, `INSERT INTO raw_observations (observation_id, asset_id, label, value, unit, observed_at)`)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err := batch.Append(row.ObservationID, row.AssetID, row.Label, row.Value, row.Unit, row.ObservedAt); err != nil {
			return err
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("bronze insert: %w", err)
	}
	return nil
}
