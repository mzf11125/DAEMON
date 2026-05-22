package analytics

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClientExecuteQueryAndResults(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Dune-Api-Key") != "dune-key" {
			t.Fatalf("missing dune api key")
		}
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/query/42/execute":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"execution_id":"exec-1"}`))
		case r.URL.Path == "/execution/exec-1/status":
			_, _ = w.Write([]byte(`{"state":"QUERY_STATE_COMPLETED"}`))
		case r.URL.Path == "/execution/exec-1/results":
			_, _ = w.Write([]byte(`{"result":{"rows":[{"id":"1","wallet":"0xw","metric":"m","amount_usd":1.5,"block_time":"2024-01-01T00:00:00Z"}]}}`))
		default:
			t.Fatalf("unexpected %s %s", r.Method, r.URL.Path)
		}
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "dune-key", 5*time.Second)
	id, err := c.ExecuteQuery(context.Background(), 42, nil)
	if err != nil || id != "exec-1" {
		t.Fatalf("execute: %v %s", err, id)
	}
	if err := c.WaitExecution(context.Background(), id, 10*time.Millisecond); err != nil {
		t.Fatal(err)
	}
	rows, err := c.FetchResults(context.Background(), id, 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("rows: %d", len(rows))
	}
	b, _ := json.Marshal(rows[0])
	if !json.Valid(b) {
		t.Fatal("invalid row json")
	}
}
