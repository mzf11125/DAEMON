package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

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

	seedDir := filepath.Join("..", "..", "connectors", "seed-data")
	f := filepath.Join(seedDir, "observations.csv")
	rows, err := readCSV(f)
	if err != nil {
		log.Fatal(err)
	}
	batch, err := conn.PrepareBatch(ctx, `INSERT INTO raw_observations (observation_id, asset_id, label, value, unit, observed_at)`)
	if err != nil {
		log.Fatal(err)
	}
	now := time.Now().UTC()
	for i, row := range rows {
		if i == 0 {
			continue
		}
		if len(row) < 5 {
			continue
		}
		val := parseFloat(row[3])
		_ = batch.Append(row[0], row[1], row[2], val, row[4], now)
	}
	if err := batch.Send(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("raw-ingest: inserted observations into raw_observations")
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
	var v float64
	fmt.Sscanf(s, "%f", &v)
	return v
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
