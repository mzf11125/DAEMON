// BigPlan Phase 3.3 | Tests for darkweb crawler scaffold

package darkwebcrawler_test

import (
	"context"
	"testing"

	darkwebcrawler "github.com/daemon-platform/collect-sensing/connectors/darkweb-crawler"
)

func TestMockTorHTTPClient_Get(t *testing.T) {
	t.Run("returns mock HTML for any onion URL", func(t *testing.T) {
		client := darkwebcrawler.NewMockTorHTTPClient()
		body, err := client.Get(context.Background(), "http://example.onion")
		if err != nil {
			t.Fatalf("expected no error, got: %v", err)
		}
		if len(body) == 0 {
			t.Error("expected non-empty body")
		}
	})

	t.Run("RotateCircuit is no-op in mock mode", func(t *testing.T) {
		client := darkwebcrawler.NewMockTorHTTPClient()
		if err := client.RotateCircuit(context.Background()); err != nil {
			t.Fatalf("expected no error from mock RotateCircuit, got: %v", err)
		}
	})
}

func TestDarkwebCrawler_CrawlTarget(t *testing.T) {
	config := darkwebcrawler.DarkwebCrawlerConfig{
		Tor:        darkwebcrawler.DefaultTorProxyConfig(), // MockMode=true
		MaxWorkers: 1,
	}
	crawler := darkwebcrawler.NewDarkwebCrawler(config)

	t.Run("rejects inactive target", func(t *testing.T) {
		target := darkwebcrawler.OnionTarget{
			ID:       "test-01",
			OnionURL: "http://test.onion",
			IsActive: false,
		}
		_, err := crawler.CrawlTarget(context.Background(), target)
		if err == nil {
			t.Error("expected error for inactive target")
		}
	})

	t.Run("rejects target without authorization", func(t *testing.T) {
		target := darkwebcrawler.OnionTarget{
			ID:           "test-02",
			OnionURL:     "http://test.onion",
			IsActive:     true,
			AuthorizedBy: "", // missing
		}
		_, err := crawler.CrawlTarget(context.Background(), target)
		if err == nil {
			t.Error("expected error for unauthorized target")
		}
	})

	t.Run("crawls mock target successfully", func(t *testing.T) {
		target := darkwebcrawler.OnionTarget{
			ID:                "test-03",
			OnionURL:          "http://mockmarket.onion",
			Category:          "marketplace",
			IsActive:          true,
			AuthorizedBy:      "direktur.ppatk@ppatk.go.id",
			AuthorizationDate: "2026-01-01",
		}
		result, err := crawler.CrawlTarget(context.Background(), target)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.TargetID != "test-03" {
			t.Errorf("expected targetId 'test-03', got '%s'", result.TargetID)
		}
		if result.Error != "" {
			t.Errorf("unexpected crawl error: %s", result.Error)
		}
	})
}

func TestListingStore_Upsert(t *testing.T) {
	store := darkwebcrawler.NewListingStore()

	listing := darkwebcrawler.DarkwebListing{
		Title:      "Test Item",
		VendorName: "TestVendor",
		Price:      "0.05 BTC",
		OnionURL:   "http://market.onion/listing/1",
	}

	t.Run("first upsert returns isNew=true", func(t *testing.T) {
		isNew, indexed := store.Upsert(listing)
		if !isNew {
			t.Error("expected isNew=true for first upsert")
		}
		if indexed.SeenCount != 1 {
			t.Errorf("expected SeenCount=1, got %d", indexed.SeenCount)
		}
	})

	t.Run("second upsert returns isNew=false and increments count", func(t *testing.T) {
		isNew, indexed := store.Upsert(listing)
		if isNew {
			t.Error("expected isNew=false for duplicate upsert")
		}
		if indexed.SeenCount != 2 {
			t.Errorf("expected SeenCount=2, got %d", indexed.SeenCount)
		}
	})
}

func TestDefaultTorProxyConfig_MockMode(t *testing.T) {
	t.Run("MockMode defaults to true", func(t *testing.T) {
		cfg := darkwebcrawler.DefaultTorProxyConfig()
		if !cfg.MockMode {
			t.Error("expected MockMode=true by default")
		}
	})
}

func TestNewLiveTorHTTPClient_RequiresClearance(t *testing.T) {
	t.Run("returns error without legal clearance", func(t *testing.T) {
		cfg := darkwebcrawler.DefaultTorProxyConfig()
		cfg.MockMode = false
		_, err := darkwebcrawler.NewLiveTorHTTPClient(cfg)
		if err == nil {
			t.Error("expected error when creating live Tor client in scaffold")
		}
	})
}
