package main

import (
	"encoding/json"
	"net/http"

	"github.com/daemon-platform/daemon/packages/go-common/db"
	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type geoPin struct {
	ID         string         `json:"id"`
	ObjectType string         `json:"objectType"`
	Name       string         `json:"name,omitempty"`
	Latitude   float64        `json:"latitude"`
	Longitude  float64        `json:"longitude"`
	Vertical   string         `json:"vertical,omitempty"`
	Properties map[string]any `json:"properties,omitempty"`
}

func mountGeoRoutes(r chi.Router, pool *pgxpool.Pool) {
	r.Get("/geo/map", geoMapHandler(pool))
}

func geoMapHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		features := tenantFeatures(r.Context(), pool, tenant)
		if !parseBoolFeature(features, "geoMapEnabled") {
			dhttp.WriteErrorRequest(w, r, http.StatusForbidden, "GEO_DISABLED", "geo map not enabled for tenant")
			return
		}
		var sites []geoPin
		var assets []geoPin
		var signals []map[string]any
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			rows, err := tx.Query(r.Context(), `
				SELECT object_type, primary_key_value, properties
				FROM ontology_objects
				WHERE tenant_id = $1 AND object_type IN ('Site', 'Asset')
				  AND properties ? 'latitude' AND properties ? 'longitude'`, tenant)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var typ, pk string
				var props []byte
				if err := rows.Scan(&typ, &pk, &props); err != nil {
					return err
				}
				var p map[string]any
				_ = json.Unmarshal(props, &p)
				lat, okLat := floatFromAny(p["latitude"])
				lon, okLon := floatFromAny(p["longitude"])
				if !okLat || !okLon {
					continue
				}
				pin := geoPin{
					ID: pk, ObjectType: typ, Latitude: lat, Longitude: lon, Properties: p,
				}
				if name, ok := p["name"].(string); ok {
					pin.Name = name
				}
				if v, ok := p["vertical"].(string); ok {
					pin.Vertical = v
				}
				switch typ {
				case "Site":
					sites = append(sites, pin)
				case "Asset":
					assets = append(assets, pin)
				}
			}
			srows, err := tx.Query(r.Context(), `
				SELECT primary_key_value, properties FROM ontology_objects
				WHERE tenant_id = $1 AND object_type = 'Signal' AND properties->>'status' = 'open'`, tenant)
			if err != nil {
				return err
			}
			defer srows.Close()
			for srows.Next() {
				var pk string
				var props []byte
				if err := srows.Scan(&pk, &props); err != nil {
					return err
				}
				var p map[string]any
				_ = json.Unmarshal(props, &p)
				signals = append(signals, map[string]any{
					"signalId": pk, "summary": p["summary"], "severity": p["severity"], "status": p["status"],
				})
			}
			return srows.Err()
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		if sites == nil {
			sites = []geoPin{}
		}
		if assets == nil {
			assets = []geoPin{}
		}
		if signals == nil {
			signals = []map[string]any{}
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"sites": sites, "assets": assets, "signals": signals,
		})
	}
}

func floatFromAny(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	default:
		return 0, false
	}
}
