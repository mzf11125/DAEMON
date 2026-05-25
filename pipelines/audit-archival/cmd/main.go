package main

import (
	"context"
	"flag"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/db"
	"github.com/daemon-platform/daemon/pipelines/audit-archival/internal/archiver"
)

const defaultLocalDSN = "postgresql://daemon_runtime:daemon_runtime_local@127.0.0.1:54332/postgres?sslmode=disable"

func main() {
	var (
		tenantID   = flag.String("tenant", "", "Filter by tenant_id (empty = all tenants)")
		sinceStr   = flag.String("since", "", "RFC3339 minimum created_at (empty = hot-retention window)")
		dryRun     = flag.Bool("dry-run", false, "Log batches only; no S3 upload, batch insert, or mark archived")
		batchLimit = flag.Int("batch-limit", 0, "Max rows per run (default 5000)")
	)
	flag.Parse()

	if envDry := os.Getenv("AUDIT_ARCHIVAL_DRY_RUN"); envDry == "1" || envDry == "true" {
		*dryRun = true
	}

	dsn := resolveDSN()
	ctx := context.Background()

	pool, err := db.NewPostgres(ctx, dsn)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer pool.Close()

	since := parseSince(*sinceStr)
	if since.IsZero() {
		days, _ := strconv.Atoi(getenv("HOT_RETENTION_DAYS", "90"))
		if days <= 0 {
			days = 90
		}
		since = time.Now().Add(-time.Duration(days) * 24 * time.Hour)
	}

	limit := *batchLimit
	if limit <= 0 {
		limit, _ = strconv.Atoi(getenv("BATCH_SIZE", "5000"))
	}
	if limit <= 0 {
		limit = 5000
	}

	bucket := getenv("AUDIT_ARCHIVE_BUCKET", getenv("ARCHIVE_BUCKET", "daemon-audit-archive"))
	var writer archiver.Writer
	if *dryRun || bucket == "" {
		writer = archiver.LogWriter{}
		log.Println("audit-archival: dry-run mode (LogWriter)")
	} else {
		region := getenv("AWS_REGION", "")
		w, err := archiver.NewS3Writer(ctx, region)
		if err != nil {
			log.Fatalf("s3 writer: %v", err)
		}
		writer = w
	}

	cfg := archiver.Config{
		TenantID:      *tenantID,
		Since:         since,
		DryRun:        *dryRun,
		BatchLimit:    limit,
		ArchiveBucket: bucket,
	}

	runner := archiver.NewRunner(
		archiver.NewPostgresReader(pool),
		writer,
		archiver.NewPostgresBatchRecorder(pool),
		cfg,
	)
	if err := runner.Run(ctx); err != nil {
		log.Fatalf("archival: %v", err)
	}
	log.Println("audit-archival: complete")
}

func resolveDSN() string {
	for _, k := range []string{"DATABASE_URL", "POSTGRES_URL"} {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return defaultLocalDSN
}

func parseSince(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		log.Fatalf("invalid --since %q: %v", s, err)
	}
	return t
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
