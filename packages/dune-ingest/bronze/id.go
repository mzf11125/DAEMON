package bronze

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// ObservationID returns a deterministic id for idempotent re-runs.
func ObservationID(connector, chainKey, eventKey, assetID, label string) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%s|%s|%s", connector, chainKey, eventKey, assetID, label)))
	return hex.EncodeToString(h[:16])
}
