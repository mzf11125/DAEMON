package archiver

import (
	"context"
	"testing"
	"time"
)

type stubReader struct {
	events []AuditEvent
}

func (s *stubReader) ListUnarchived(ctx context.Context, tenantID string, since time.Time, limit int) ([]AuditEvent, error) {
	return s.events, nil
}

func (s *stubReader) MarkArchived(ctx context.Context, tenantID string, eventIDs []string) error {
	return nil
}

type stubRecorder struct{}

func (stubRecorder) LastBatchHash(ctx context.Context, tenantID, eventClass string) (string, error) {
	return "", nil
}

func (stubRecorder) InsertBatch(ctx context.Context, batch ArchiveBatch) error {
	return nil
}

func TestRunnerDryRun(t *testing.T) {
	now := time.Date(2026, 5, 25, 12, 0, 0, 0, time.UTC)
	events := []AuditEvent{{
		EventID: "e1", TenantID: "tenant-demo", EventClass: "operational",
		Payload: []byte(`{"k":"v"}`), CreatedAt: now,
	}}
	r := NewRunner(
		&stubReader{events: events},
		LogWriter{},
		stubRecorder{},
		Config{TenantID: "tenant-demo", DryRun: true, ArchiveBucket: "test-bucket"},
	)
	if err := r.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestBuildJSONL(t *testing.T) {
	events := []AuditEvent{{
		EventID: "e1", TenantID: "t", EventClass: "security",
		Payload: []byte(`{}`), CreatedAt: time.Unix(0, 0).UTC(),
	}}
	b, err := buildJSONL(events)
	if err != nil || len(b) == 0 {
		t.Fatalf("buildJSONL: err=%v len=%d", err, len(b))
	}
}
