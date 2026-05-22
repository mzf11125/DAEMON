package db

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
)

func NewClickHouse(ctx context.Context, dsn string) (clickhouse.Conn, error) {
	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	return clickhouse.Open(opts)
}
