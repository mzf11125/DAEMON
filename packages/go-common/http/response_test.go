package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/daemon-platform/daemon/packages/go-common/ctxkeys"
)

func TestWriteErrorRequestIncludesRequestIdAndTimestamp(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := context.WithValue(req.Context(), ctxkeys.RequestID, "req-test-123")
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()

	WriteErrorRequest(rr, req, StatusUnprocessable, "MISSING_PARAM", "field required")

	if rr.Code != StatusUnprocessable {
		t.Fatalf("status: got %d", rr.Code)
	}
	var env Envelope
	if err := json.NewDecoder(rr.Body).Decode(&env); err != nil {
		t.Fatal(err)
	}
	if env.Error == nil {
		t.Fatal("expected error body")
	}
	if env.Error.Code != "MISSING_PARAM" {
		t.Fatalf("code: %s", env.Error.Code)
	}
	if env.Error.RequestID != "req-test-123" {
		t.Fatalf("requestId: %s", env.Error.RequestID)
	}
	if env.Error.Timestamp == "" {
		t.Fatal("expected timestamp")
	}
}

func TestParseListPaginationDefaultsAndCap(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/?limit=999&offset=5", nil)
	limit, offset := ParseListPagination(req)
	if limit != MaxListLimit {
		t.Fatalf("limit cap: got %d", limit)
	}
	if offset != 5 {
		t.Fatalf("offset: got %d", offset)
	}
}

func TestListMetaHasMore(t *testing.T) {
	meta := ListMeta(100, 50, 50, 50)
	if meta["hasMore"] != false {
		t.Fatalf("hasMore: %v", meta["hasMore"])
	}
	meta2 := ListMeta(100, 50, 0, 50)
	if meta2["hasMore"] != true {
		t.Fatalf("hasMore: %v", meta2["hasMore"])
	}
}
