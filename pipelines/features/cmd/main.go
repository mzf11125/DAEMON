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

	q := `INSERT INTO daemon.features_asset_daily
	SELECT asset_id, toDate(observed_at) AS day, count() AS observation_count, avg(value) AS avg_value, max(value) AS max_value
	FROM daemon.dataset_observations GROUP BY asset_id, day`
	if err := conn.Exec(ctx, q); err != nil {
		log.Fatal(err)
	}
	labelQ := `INSERT INTO daemon.features_label_daily
	SELECT asset_id, label, toDate(observed_at) AS day, tenant_id,
		count() AS observation_count, avg(value) AS avg_value, max(value) AS max_value, stddevPop(value) AS stddev_value
	FROM daemon.dataset_observations
	GROUP BY asset_id, label, day, tenant_id`
	if err := conn.Exec(ctx, labelQ); err != nil {
		log.Fatal(err)
	}
	fmt.Println("features: built features_asset_daily and features_label_daily")
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
