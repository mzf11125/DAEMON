package analytics

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/daemon-platform/daemon/packages/dune-ingest/bronze"
	"github.com/daemon-platform/daemon/packages/dune-ingest/ingestparams"
)

const connectorID = "dune-sql"

// Run ingests Dune Analytics SQL results into bronze.
func Run(ctx context.Context, cfg ingestparams.RunConfig, raw json.RawMessage) error {
	if cfg.DuneAPIKey == "" {
		return fmt.Errorf("DUNE_API_KEY is not configured")
	}
	var p ingestparams.DuneSQLParams
	if err := json.Unmarshal(raw, &p); err != nil {
		return fmt.Errorf("parse dune-sql params: %w", err)
	}
	mode := strings.ToLower(strings.TrimSpace(p.Mode))
	if mode == "" {
		mode = "query_id"
	}

	client := NewClient(cfg.DuneBaseURL, cfg.DuneAPIKey, cfg.HTTPTimeout)
	var executionID string
	var err error
	switch mode {
	case "query_id":
		executionID, err = client.ExecuteQuery(ctx, p.QueryID, p.QueryParameters)
	case "execute_sql":
		executionID, err = client.ExecuteSQL(ctx, p.SQL, p.Performance)
	default:
		return fmt.Errorf("unsupported mode %q", mode)
	}
	if err != nil {
		return err
	}
	if err := client.WaitExecution(ctx, executionID, 2*time.Second); err != nil {
		return err
	}
	rows, err := client.FetchResults(ctx, executionID, cfg.MaxRows)
	if err != nil {
		return err
	}
	obs, err := mapRows(rows, p.ColumnMap, time.Now().UTC())
	if err != nil {
		return err
	}
	return bronze.Insert(ctx, cfg.ClickHouseDSN, obs)
}

func mapRows(rows []map[string]any, cm ingestparams.ColumnMap, now time.Time) ([]bronze.Row, error) {
	out := make([]bronze.Row, 0, len(rows))
	for i, row := range rows {
		obsID, err := cellString(row, cm.ObservationID)
		if err != nil || obsID == "" {
			obsID = fmt.Sprintf("row-%d", i)
		}
		asset, err := cellString(row, cm.AssetID)
		if err != nil {
			return nil, fmt.Errorf("row %d asset_id: %w", i, err)
		}
		label, err := cellString(row, cm.Label)
		if err != nil {
			return nil, fmt.Errorf("row %d label: %w", i, err)
		}
		val, err := cellFloat(row, cm.Value)
		if err != nil {
			return nil, fmt.Errorf("row %d value: %w", i, err)
		}
		unit := "count"
		if cm.Unit != "" {
			if u, e := cellString(row, cm.Unit); e == nil && u != "" {
				unit = u
			}
		}
		ts, err := cellTime(row, cm.ObservedAt)
		if err != nil {
			ts = now
		}
		chainKey := "dune"
		eventKey := obsID
		out = append(out, bronze.Row{
			ObservationID: bronze.ObservationID(connectorID, chainKey, eventKey, asset, label),
			AssetID:       asset,
			Label:         label,
			Value:         val,
			Unit:          unit,
			ObservedAt:    ts,
		})
	}
	return out, nil
}

func cellString(row map[string]any, col string) (string, error) {
	v, ok := row[col]
	if !ok {
		return "", fmt.Errorf("column %q missing", col)
	}
	switch t := v.(type) {
	case string:
		return t, nil
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64), nil
	case json.Number:
		return t.String(), nil
	default:
		b, _ := json.Marshal(t)
		return string(b), nil
	}
}

func cellFloat(row map[string]any, col string) (float64, error) {
	s, err := cellString(row, col)
	if err != nil {
		return 0, err
	}
	return strconv.ParseFloat(s, 64)
}

func cellTime(row map[string]any, col string) (time.Time, error) {
	s, err := cellString(row, col)
	if err != nil {
		return time.Time{}, err
	}
	for _, layout := range []string{time.RFC3339, time.RFC3339Nano, "2006-01-02 15:04:05", "2006-01-02"} {
		if t, e := time.Parse(layout, s); e == nil {
			return t.UTC(), nil
		}
	}
	if n, err := strconv.ParseInt(s, 10, 64); err == nil {
		if n > 1_000_000_000_000 {
			return time.UnixMilli(n).UTC(), nil
		}
		return time.Unix(n, 0).UTC(), nil
	}
	return time.Time{}, fmt.Errorf("unparseable time %q", s)
}
