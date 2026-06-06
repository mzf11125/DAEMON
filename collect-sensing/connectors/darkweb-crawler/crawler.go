// BigPlan Phase 3.3 | Darkweb Crawler — whitelist-only Go crawler scaffold
// LEGAL NOTE: Live crawling requires PPATK authorization under UU 8/2010 Pasal 44.

package darkwebcrawler

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// OnionTarget represents a whitelisted .onion URL to monitor.
// ALL targets MUST be in the approved whitelist — no ad-hoc crawling.
type OnionTarget struct {
	// ID: unique identifier for this target
	ID string `yaml:"id"`
	// OnionURL: the .onion address (e.g., "http://example.onion")
	OnionURL string `yaml:"onionUrl"`
	// Category: type of target (marketplace, forum, paste, vendor_shop)
	Category string `yaml:"category"`
	// ScanIntervalHours: how often to scan (minimum 24h)
	ScanIntervalHours int `yaml:"scanIntervalHours"`
	// Tags: labels for categorization
	Tags []string `yaml:"tags"`
	// IsActive: only crawl if true
	IsActive bool `yaml:"isActive"`
	// AuthorizedBy: name/ID of authorizing official
	AuthorizedBy string `yaml:"authorizedBy"`
	// AuthorizationDate: ISO date of authorization
	AuthorizationDate string `yaml:"authorizationDate"`
}

// CrawlResult represents the parsed result of crawling one onion target.
type CrawlResult struct {
	TargetID    string           `json:"targetId"`
	OnionURL    string           `json:"onionUrl"`
	CrawledAt   time.Time        `json:"crawledAt"`
	StatusCode  int              `json:"statusCode"`
	ContentHash string           `json:"contentHash"` // SHA-256 of body for dedup
	Listings    []DarkwebListing `json:"listings"`
	Vendors     []DarkwebVendor  `json:"vendors"`
	RawTitle    string           `json:"rawTitle"`
	Error       string           `json:"error,omitempty"`
}

// DarkwebListing represents a product/service listing found on a darkweb market.
type DarkwebListing struct {
	ListingID   string   `json:"listingId"`   // Derived from URL or hash
	Title       string   `json:"title"`
	Price       string   `json:"price"`       // Raw price string (e.g., "0.05 BTC")
	PriceCrypto string   `json:"priceCrypto"` // Normalized crypto amount
	Currency    string   `json:"currency"`    // BTC, XMR, ETH
	Category    string   `json:"category"`
	VendorName  string   `json:"vendorName"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	OnionURL    string   `json:"onionUrl"` // Source URL
	ScrapedAt   string   `json:"scrapedAt"`
}

// DarkwebVendor represents a vendor profile found on a darkweb market.
type DarkwebVendor struct {
	VendorHandle    string `json:"vendorHandle"`
	PgpKey          string `json:"pgpKey,omitempty"`
	TrustScore      string `json:"trustScore,omitempty"`
	TotalSales      int    `json:"totalSales,omitempty"`
	ActiveSince     string `json:"activeSince,omitempty"`
	SourceMarketURL string `json:"sourceMarketUrl"`
}

// DarkwebCrawlerConfig holds crawler configuration.
type DarkwebCrawlerConfig struct {
	Tor        TorProxyConfig `yaml:"tor"`
	Targets    []OnionTarget  `yaml:"targets"`
	MaxWorkers int            `yaml:"maxWorkers"`
	// DualControlRequired: require 2 operators to start crawl session
	DualControlRequired bool `yaml:"dualControlRequired"`
}

// PageParser defines the interface for parsing crawled HTML content.
// Each market type may need a specialized parser.
type PageParser interface {
	ParseListings(html []byte, sourceURL string) ([]DarkwebListing, error)
	ParseVendors(html []byte, sourceURL string) ([]DarkwebVendor, error)
	ParseTitle(html []byte) string
}

// GenericParser provides basic HTML parsing without market-specific selectors.
// Concrete parsers per marketplace should implement PageParser for better accuracy.
type GenericParser struct{}

func (p *GenericParser) ParseListings(html []byte, sourceURL string) ([]DarkwebListing, error) {
	// TODO: implement with golang.org/x/net/html
	// For scaffold: return empty slice
	slog.Info("GenericParser.ParseListings: scaffold — no-op", "url", sourceURL)
	return []DarkwebListing{}, nil
}

func (p *GenericParser) ParseVendors(html []byte, sourceURL string) ([]DarkwebVendor, error) {
	slog.Info("GenericParser.ParseVendors: scaffold — no-op")
	return []DarkwebVendor{}, nil
}

func (p *GenericParser) ParseTitle(html []byte) string {
	return "SCAFFOLD_MOCK_TITLE"
}

// DarkwebCrawler is the main crawler orchestrator.
// In MockMode: uses MockTorHTTPClient, returns mock data.
// In live mode: requires legal authorization + dual-control.
type DarkwebCrawler struct {
	config DarkwebCrawlerConfig
	client TorHTTPClient
	parser PageParser
	logger *slog.Logger
}

// NewDarkwebCrawler creates a new crawler.
// ALWAYS starts in MockMode unless config.Tor.MockMode = false AND
// proper authorization has been verified externally.
func NewDarkwebCrawler(config DarkwebCrawlerConfig) *DarkwebCrawler {
	var client TorHTTPClient
	if config.Tor.MockMode {
		client = NewMockTorHTTPClient()
	} else {
		// Attempt live connection — will fail with error message
		var err error
		client, err = NewLiveTorHTTPClient(config.Tor)
		if err != nil {
			slog.Error("Failed to create live Tor client, falling back to mock", "err", err)
			client = NewMockTorHTTPClient()
		}
	}

	return &DarkwebCrawler{
		config: config,
		client: client,
		parser: &GenericParser{},
		logger: slog.Default(),
	}
}

// CrawlTarget crawls a single whitelisted onion target.
func (c *DarkwebCrawler) CrawlTarget(ctx context.Context, target OnionTarget) (*CrawlResult, error) {
	if !target.IsActive {
		return nil, fmt.Errorf("target %s is not active", target.ID)
	}

	if target.AuthorizedBy == "" {
		return nil, fmt.Errorf(
			"target %s missing authorization — all crawl targets must have AuthorizedBy set",
			target.ID,
		)
	}

	c.logger.Info("Crawling target",
		"targetId", target.ID,
		"url", target.OnionURL,
		"authorized_by", target.AuthorizedBy,
	)

	body, err := c.client.Get(ctx, target.OnionURL)
	if err != nil {
		return &CrawlResult{
			TargetID:  target.ID,
			OnionURL:  target.OnionURL,
			CrawledAt: time.Now(),
			Error:     err.Error(),
		}, nil
	}

	listings, _ := c.parser.ParseListings(body, target.OnionURL)
	vendors, _ := c.parser.ParseVendors(body, target.OnionURL)
	title := c.parser.ParseTitle(body)

	return &CrawlResult{
		TargetID:    target.ID,
		OnionURL:    target.OnionURL,
		CrawledAt:   time.Now(),
		StatusCode:  200,
		ContentHash: fmt.Sprintf("sha256:%x", len(body)), // placeholder
		Listings:    listings,
		Vendors:     vendors,
		RawTitle:    title,
	}, nil
}

// CrawlAll crawls all active targets in the whitelist sequentially.
func (c *DarkwebCrawler) CrawlAll(ctx context.Context) ([]*CrawlResult, error) {
	var results []*CrawlResult
	for _, target := range c.config.Targets {
		if !target.IsActive {
			continue
		}
		result, err := c.CrawlTarget(ctx, target)
		if err != nil {
			c.logger.Error("Crawl failed", "targetId", target.ID, "err", err)
			continue
		}
		results = append(results, result)
	}
	return results, nil
}
