package sim

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClientEVMBalances(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Sim-Api-Key") != "test-key" {
			t.Fatalf("missing api key header")
		}
		if r.URL.Path != "/v1/evm/balances/0xabc" {
			t.Fatalf("path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"balances":[{"chain_id":1,"token_address":"0x0","amount":"1","value_usd":10.5}]}`))
	}))
	defer srv.Close()

	c := NewClient(srv.URL, "test-key", 5*time.Second)
	body, err := c.EVMBalances(context.Background(), "0xabc", []int{1}, 10)
	if err != nil {
		t.Fatal(err)
	}
	rows := parseEVMBalances("0xabc", []int{1}, body, time.Unix(0, 0))
	if len(rows) != 1 {
		t.Fatalf("rows: %d", len(rows))
	}
	if rows[0].Label != "balance_usd" {
		t.Fatalf("label: %s", rows[0].Label)
	}
}
