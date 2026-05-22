package ingestparams

import "time"

// RunConfig holds runtime settings for Sim and Dune SQL ingestion.
type RunConfig struct {
	ClickHouseDSN string
	SimAPIKey     string
	SimBaseURL    string
	DuneAPIKey    string
	DuneBaseURL   string
	MaxRows       int
	HTTPTimeout   time.Duration
}
