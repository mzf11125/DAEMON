package ingestparams

import (
	"os"
	"strconv"
	"time"
)

// RunConfigFromEnv builds RunConfig from environment variables.
func RunConfigFromEnv(clickhouseDSN string) RunConfig {
	cfg := RunConfig{
		ClickHouseDSN: clickhouseDSN,
		SimAPIKey:     os.Getenv("SIM_API_KEY"),
		SimBaseURL:    envOr("SIM_API_BASE_URL", "https://api.sim.dune.com"),
		DuneAPIKey:    os.Getenv("DUNE_API_KEY"),
		DuneBaseURL:   envOr("DUNE_API_BASE_URL", "https://api.dune.com/api/v1"),
		MaxRows:       50_000,
		HTTPTimeout:   120 * time.Second,
	}
	if v := os.Getenv("DUNE_INGEST_MAX_ROWS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cfg.MaxRows = n
		}
	}
	if v := os.Getenv("SIM_INGEST_TIMEOUT"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			cfg.HTTPTimeout = d
		}
	}
	return cfg
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
