package archiver

import (
	"context"
	"time"
)

// AuditEvent is a row from audit_log eligible for cold archival.
type AuditEvent struct {
	EventID      string
	TenantID     string
	ActorID      string
	ActionType   string
	ResourceType string
	ResourceID   string
	EventClass   string
	Payload      []byte
	CreatedAt    time.Time
}

// Reader loads hot-store audit events for archival.
type Reader interface {
	// ListUnarchived returns audit_log rows with archived=false, optionally filtered by tenant and created_at >= since.
	ListUnarchived(ctx context.Context, tenantID string, since time.Time, limit int) ([]AuditEvent, error)
	// MarkArchived sets archived=true for the given event IDs (no-op in dry-run at runner level).
	MarkArchived(ctx context.Context, tenantID string, eventIDs []string) error
}

// ArchiveBatch describes one immutable cold-store object plus chain metadata.
type ArchiveBatch struct {
	TenantID          string
	EventClass        string
	FromCreatedAt     time.Time
	ToCreatedAt       time.Time
	RowCount          int
	PayloadHash       string
	PreviousBatchHash string
	Bucket            string
	Key               string
	ETag              string
	SizeBytes         int64
}

// Writer persists batches to object storage and records metadata (Postgres batch table is separate).
type Writer interface {
	// WriteBatch uploads JSONL.gz payload; returns etag and size. Dry-run implementations log only.
	WriteBatch(ctx context.Context, batch ArchiveBatch, payloadJSONL []byte) (etag string, sizeBytes int64, err error)
}

// BatchRecorder persists audit_archive_batches rows after successful upload.
type BatchRecorder interface {
	InsertBatch(ctx context.Context, batch ArchiveBatch) error
	// LastBatchHash returns the previous_batch_hash for hash chaining, or "" for genesis.
	LastBatchHash(ctx context.Context, tenantID, eventClass string) (string, error)
}

// Config holds runtime limits for the archival job.
type Config struct {
	TenantID     string
	Since        time.Time
	DryRun       bool
	BatchLimit   int
	HotRetention time.Duration
	ArchiveBucket string
}
