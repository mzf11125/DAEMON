// BigPlan Phase 3.4 | Marketplace Indexer — index darkweb listings & vendors

package darkwebcrawler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"
	"time"
)

// IndexedListing is a listing that has been deduplicated and enriched.
type IndexedListing struct {
	DarkwebListing
	// ContentHash: SHA-256 of title+vendor+price for dedup
	ContentHash string `json:"contentHash"`
	// FirstSeenAt: timestamp when first indexed
	FirstSeenAt time.Time `json:"firstSeenAt"`
	// LastSeenAt: timestamp of most recent crawl
	LastSeenAt time.Time `json:"lastSeenAt"`
	// SeenCount: number of times this listing was found
	SeenCount int `json:"seenCount"`
	// IntelligenceEntityID: if mapped to a Daemon entity, its ID
	IntelligenceEntityID string `json:"intelligenceEntityId,omitempty"`
}

// ListingStore is an in-memory store for indexed listings.
// In production: replace with PostgreSQL via @daemon/data-platform.
type ListingStore struct {
	listings map[string]*IndexedListing // keyed by ContentHash
	logger   *slog.Logger
}

func NewListingStore() *ListingStore {
	return &ListingStore{
		listings: make(map[string]*IndexedListing),
		logger:   slog.Default(),
	}
}

// Upsert adds or updates a listing in the store.
// Returns (isNew, listing).
func (s *ListingStore) Upsert(listing DarkwebListing) (bool, *IndexedListing) {
	hash := s.contentHash(listing)
	now := time.Now()

	if existing, ok := s.listings[hash]; ok {
		existing.LastSeenAt = now
		existing.SeenCount++
		s.logger.Debug("Updated existing listing", "hash", hash, "count", existing.SeenCount)
		return false, existing
	}

	indexed := &IndexedListing{
		DarkwebListing: listing,
		ContentHash:    hash,
		FirstSeenAt:    now,
		LastSeenAt:     now,
		SeenCount:      1,
	}
	s.listings[hash] = indexed
	s.logger.Info("Indexed new listing", "title", listing.Title, "vendor", listing.VendorName)
	return true, indexed
}

// Search returns listings matching a keyword in title or description.
func (s *ListingStore) Search(keyword string) []*IndexedListing {
	var results []*IndexedListing
	for _, l := range s.listings {
		if contains(l.Title, keyword) || contains(l.Description, keyword) {
			results = append(results, l)
		}
	}
	return results
}

// All returns all indexed listings.
func (s *ListingStore) All() []*IndexedListing {
	result := make([]*IndexedListing, 0, len(s.listings))
	for _, l := range s.listings {
		result = append(result, l)
	}
	return result
}

func (s *ListingStore) contentHash(l DarkwebListing) string {
	raw := l.Title + "|" + l.VendorName + "|" + l.Price + "|" + l.OnionURL
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

func contains(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	return strings.Contains(s, substr)
}

// MarketplaceIndexer orchestrates crawling + indexing.
type MarketplaceIndexer struct {
	crawler *DarkwebCrawler
	store   *ListingStore
	logger  *slog.Logger
}

func NewMarketplaceIndexer(config DarkwebCrawlerConfig) *MarketplaceIndexer {
	return &MarketplaceIndexer{
		crawler: NewDarkwebCrawler(config),
		store:   NewListingStore(),
		logger:  slog.Default(),
	}
}

// IndexAll crawls all targets and indexes results.
func (m *MarketplaceIndexer) IndexAll(ctx context.Context) (int, int, error) {
	results, err := m.crawler.CrawlAll(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("crawl failed: %w", err)
	}

	newCount, updateCount := 0, 0
	for _, result := range results {
		for _, listing := range result.Listings {
			isNew, _ := m.store.Upsert(listing)
			if isNew {
				newCount++
			} else {
				updateCount++
			}
		}
	}

	m.logger.Info("Indexing complete",
		"new_listings", newCount,
		"updated_listings", updateCount,
	)
	return newCount, updateCount, nil
}

// GetStore returns the underlying listing store for querying.
func (m *MarketplaceIndexer) GetStore() *ListingStore {
	return m.store
}
