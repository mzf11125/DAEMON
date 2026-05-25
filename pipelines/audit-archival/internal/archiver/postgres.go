package archiver

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresReader reads from audit_log via pgx.
type PostgresReader struct {
	pool *pgxpool.Pool
}

func NewPostgresReader(pool *pgxpool.Pool) *PostgresReader {
	return &PostgresReader{pool: pool}
}

func (r *PostgresReader) ListUnarchived(ctx context.Context, tenantID string, since time.Time, limit int) ([]AuditEvent, error) {
	if limit <= 0 {
		limit = 5000
	}
	q := `
SELECT event_id::text, tenant_id, COALESCE(actor_id, ''), action_type,
       COALESCE(resource_type, ''), COALESCE(resource_id, ''),
       COALESCE(NULLIF(event_class, ''), 'operational'),
       payload, created_at
FROM audit_log
WHERE archived = false
  AND ($1 = '' OR tenant_id = $1)
  AND ($2::timestamptz IS NULL OR created_at >= $2)
ORDER BY tenant_id, created_at
LIMIT $3`
	var sinceArg any
	if since.IsZero() {
		sinceArg = nil
	} else {
		sinceArg = since
	}
	rows, err := r.pool.Query(ctx, q, tenantID, sinceArg, limit)
	if err != nil {
		return nil, fmt.Errorf("list unarchived audit_log: %w", err)
	}
	defer rows.Close()

	var out []AuditEvent
	for rows.Next() {
		var e AuditEvent
		var payload map[string]any
		if err := rows.Scan(
			&e.EventID, &e.TenantID, &e.ActorID, &e.ActionType,
			&e.ResourceType, &e.ResourceID, &e.EventClass,
			&payload, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		raw, _ := json.Marshal(payload)
		e.Payload = raw
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *PostgresReader) MarkArchived(ctx context.Context, tenantID string, eventIDs []string) error {
	if len(eventIDs) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
UPDATE audit_log SET archived = true
WHERE tenant_id = $1 AND event_id::text = ANY($2)`, tenantID, eventIDs)
	if err != nil {
		return fmt.Errorf("mark archived: %w", err)
	}
	return nil
}

// PostgresBatchRecorder writes audit_archive_batches.
type PostgresBatchRecorder struct {
	pool *pgxpool.Pool
}

func NewPostgresBatchRecorder(pool *pgxpool.Pool) *PostgresBatchRecorder {
	return &PostgresBatchRecorder{pool: pool}
}

func (r *PostgresBatchRecorder) LastBatchHash(ctx context.Context, tenantID, eventClass string) (string, error) {
	var hash *string
	err := r.pool.QueryRow(ctx, `
SELECT payload_hash FROM audit_archive_batches
WHERE tenant_id = $1 AND event_class = $2
ORDER BY created_at DESC LIMIT 1`, tenantID, eventClass).Scan(&hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	if hash == nil {
		return "", nil
	}
	return *hash, nil
}

func (r *PostgresBatchRecorder) InsertBatch(ctx context.Context, batch ArchiveBatch) error {
	_, err := r.pool.Exec(ctx, `
INSERT INTO audit_archive_batches (
  tenant_id, event_class, from_created_at, to_created_at, row_count,
  payload_hash, previous_batch_hash, archive_bucket, archive_key,
  archive_etag, archive_size_bytes
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		batch.TenantID, batch.EventClass, batch.FromCreatedAt, batch.ToCreatedAt, batch.RowCount,
		batch.PayloadHash, nullIfEmpty(batch.PreviousBatchHash), batch.Bucket, batch.Key,
		nullIfEmpty(batch.ETag), batch.SizeBytes,
	)
	if err != nil {
		return fmt.Errorf("insert audit_archive_batches: %w", err)
	}
	return nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
