package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/ClickHouse/clickhouse-go/v2"
)

const modelVersion = "express-routing-logistic-v1"

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

	tenant := getenv("TENANT_ID", "tenant-demo")

	// Logistic-style score from z-score vs 7-day label baseline; fallback when std=0 uses pct above baseline.
	q := `
INSERT INTO daemon.propensity_model_scores (asset_id, label, day, tenant_id, model_version, score)
SELECT
    o.asset_id,
    'express_routing_variance_pct' AS label,
    toDate(o.observed_at) AS day,
    o.tenant_id,
    ? AS model_version,
    least(1.0, greatest(0.0,
        if(b.baseline_std > 0,
            0.5 + 0.5 * tanh((o.value - b.baseline_avg) / b.baseline_std / 3.0),
            if(b.baseline_avg > 0, (o.value - b.baseline_avg) / b.baseline_avg, 0)
        )
    )) AS score
FROM daemon.dataset_observations o
INNER JOIN (
    SELECT asset_id, tenant_id,
        avg(avg_value) AS baseline_avg,
        stddevPop(avg_value) AS baseline_std
    FROM daemon.features_label_daily
    WHERE label = 'express_routing_variance_pct'
      AND tenant_id = ?
      AND day >= today() - 7 AND day < today()
    GROUP BY asset_id, tenant_id
) b ON o.asset_id = b.asset_id AND o.tenant_id = b.tenant_id
WHERE o.label = 'express_routing_variance_pct'
  AND o.tenant_id = ?
  AND toDate(o.observed_at) >= today() - 1`
	if err := conn.Exec(ctx, q, modelVersion, tenant, tenant); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("propensity-train: wrote scores model=%s tenant=%s\n", modelVersion, tenant)
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
