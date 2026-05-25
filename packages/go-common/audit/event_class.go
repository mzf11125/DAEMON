package audit

import "strings"

// EventClass maps action_type to archival/compliance class (migration 009).
func EventClass(actionType string) string {
	at := strings.ToLower(strings.TrimSpace(actionType))
	switch {
	case strings.HasPrefix(at, "auth."), strings.HasPrefix(at, "security."):
		return "security"
	case strings.HasPrefix(at, "case."), strings.HasPrefix(at, "signal."):
		return "case"
	case strings.HasPrefix(at, "ingest."), strings.HasPrefix(at, "pipeline."):
		return "ingestion"
	case strings.HasPrefix(at, "ontology."), strings.HasPrefix(at, "object."):
		return "ontology"
	case strings.HasPrefix(at, "express."), strings.HasPrefix(at, "shipment."):
		return "express"
	default:
		return "operational"
	}
}
