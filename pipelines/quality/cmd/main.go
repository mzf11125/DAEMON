package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type check struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	SQL         string `json:"sql"`
	MinRows     int    `json:"minRows"`
}

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

	checksDir := filepath.Join("..", "..", "observability", "checks")
	entries, err := os.ReadDir(checksDir)
	if err != nil {
		log.Fatal(err)
	}
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		b, err := os.ReadFile(filepath.Join(checksDir, e.Name()))
		if err != nil {
			log.Fatal(err)
		}
		var c check
		if err := json.Unmarshal(b, &c); err != nil {
			log.Fatal(err)
		}
		var count uint64
		if err := conn.QueryRow(ctx, c.SQL).Scan(&count); err != nil {
			log.Fatalf("check %s failed: %v", c.ID, err)
		}
		if int(count) < c.MinRows {
			log.Fatalf("check %s: row count %d below min %d", c.ID, count, c.MinRows)
		}
		fmt.Printf("quality: %s ok (%d rows)\n", c.ID, count)
	}
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
