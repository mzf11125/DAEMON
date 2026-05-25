package archiver

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"
)

// Runner orchestrates read → batch → write → record.
type Runner struct {
	reader   Reader
	writer   Writer
	recorder BatchRecorder
	cfg      Config
}

func NewRunner(reader Reader, writer Writer, recorder BatchRecorder, cfg Config) *Runner {
	return &Runner{reader: reader, writer: writer, recorder: recorder, cfg: cfg}
}

func (r *Runner) Run(ctx context.Context) error {
	events, err := r.reader.ListUnarchived(ctx, r.cfg.TenantID, r.cfg.Since, r.cfg.BatchLimit)
	if err != nil {
		return err
	}
	if len(events) == 0 {
		log.Printf("audit-archival: no unarchived rows tenant=%q since=%v", r.cfg.TenantID, r.cfg.Since)
		return nil
	}

	byTenantClass := groupByTenantClass(events)
	for key, group := range byTenantClass {
		if err := r.archiveGroup(ctx, key.tenant, key.class, group); err != nil {
			return err
		}
	}
	return nil
}

type tenantClassKey struct {
	tenant, class string
}

func groupByTenantClass(events []AuditEvent) map[tenantClassKey][]AuditEvent {
	m := make(map[tenantClassKey][]AuditEvent)
	for _, e := range events {
		k := tenantClassKey{tenant: e.TenantID, class: e.EventClass}
		m[k] = append(m[k], e)
	}
	return m
}

func (r *Runner) archiveGroup(ctx context.Context, tenantID, eventClass string, events []AuditEvent) error {
	sort.Slice(events, func(i, j int) bool {
		return events[i].CreatedAt.Before(events[j].CreatedAt)
	})
	jsonl, err := buildJSONL(events)
	if err != nil {
		return err
	}
	hash := sha256.Sum256(jsonl)
	payloadHash := hex.EncodeToString(hash[:])

	prev, err := r.recorder.LastBatchHash(ctx, tenantID, eventClass)
	if err != nil {
		return err
	}

	from := events[0].CreatedAt
	to := events[len(events)-1].CreatedAt
	bucket := r.cfg.ArchiveBucket
	if bucket == "" {
		bucket = "daemon-audit-archive"
	}
	key := fmt.Sprintf("%s/%s/%s/%s.jsonl",
		tenantID, eventClass, from.Format("2006/01/02"), payloadHash[:16])

	batch := ArchiveBatch{
		TenantID:          tenantID,
		EventClass:        eventClass,
		FromCreatedAt:     from,
		ToCreatedAt:       to,
		RowCount:          len(events),
		PayloadHash:       payloadHash,
		PreviousBatchHash: prev,
		Bucket:            bucket,
		Key:               key,
	}

	etag, size, err := r.writer.WriteBatch(ctx, batch, jsonl)
	if err != nil {
		return err
	}
	batch.ETag = etag
	batch.SizeBytes = size

	if r.cfg.DryRun {
		log.Printf("audit-archival dry-run: skip audit_archive_batches insert and mark archived tenant=%s class=%s rows=%d",
			tenantID, eventClass, len(events))
		return nil
	}

	if err := r.recorder.InsertBatch(ctx, batch); err != nil {
		return err
	}
	ids := make([]string, len(events))
	for i, e := range events {
		ids[i] = e.EventID
	}
	return r.reader.MarkArchived(ctx, tenantID, ids)
}

func buildJSONL(events []AuditEvent) ([]byte, error) {
	var b strings.Builder
	enc := json.NewEncoder(&b)
	for _, e := range events {
		row := map[string]any{
			"event_id":      e.EventID,
			"tenant_id":     e.TenantID,
			"actor_id":      e.ActorID,
			"action_type":   e.ActionType,
			"resource_type": e.ResourceType,
			"resource_id":   e.ResourceID,
			"event_class":   e.EventClass,
			"payload":       json.RawMessage(e.Payload),
			"created_at":    e.CreatedAt.UTC().Format(time.RFC3339Nano),
		}
		if err := enc.Encode(row); err != nil {
			return nil, err
		}
	}
	return []byte(b.String()), nil
}
