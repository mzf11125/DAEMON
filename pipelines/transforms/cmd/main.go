package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/ClickHouse/clickhouse-go/v2"
)

func main() {
	ctx := context.Background()
	dsn := getenv("CLICKHOUSE_DSN", "clickhouse://daemon:daemon@localhost:9000/daemon")
	chOpts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		log.Fatal(err)
	}
	conn, err := clickhouse.Open(chOpts)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	q := `INSERT INTO dataset_observations
	SELECT observation_id, label, value, unit, observed_at, asset_id, observed_at, observed_at, tenant_id
	FROM raw_observations`
	if err := conn.Exec(ctx, q); err != nil {
		log.Fatal(err)
	}
	fmt.Println("transforms: copied raw_observations -> dataset_observations")
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
