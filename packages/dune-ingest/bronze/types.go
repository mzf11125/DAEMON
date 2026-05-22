package bronze

import "time"

// Row is a normalized bronze observation for daemon.raw_observations.
type Row struct {
	ObservationID string
	AssetID       string
	Label         string
	Value         float64
	Unit          string
	ObservedAt    time.Time
}
