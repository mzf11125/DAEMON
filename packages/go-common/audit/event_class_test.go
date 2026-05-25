package audit

import "testing"

func TestEventClass(t *testing.T) {
	tests := []struct {
		action string
		want   string
	}{
		{"auth.login", "security"},
		{"case.decision.record", "case"},
		{"ingest.job.complete", "ingestion"},
		{"ontology.sync", "ontology"},
		{"express.draft.create", "express"},
		{"unknown.action", "operational"},
	}
	for _, tc := range tests {
		if got := EventClass(tc.action); got != tc.want {
			t.Fatalf("EventClass(%q)=%q want %q", tc.action, got, tc.want)
		}
	}
}
