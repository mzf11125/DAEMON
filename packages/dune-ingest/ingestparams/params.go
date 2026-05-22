package ingestparams

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// SimParams configures the sim-dune connector.
type SimParams struct {
	Addresses       []string `json:"addresses"`
	ChainIDs        []int    `json:"chain_ids"`
	SVMChain        string   `json:"svm_chain"`
	Sources         []string `json:"sources"`
	LimitPerAddress int      `json:"limit_per_address"`
}

// DuneSQLParams configures the dune-sql connector.
type DuneSQLParams struct {
	Mode            string            `json:"mode"`
	QueryID         int64             `json:"query_id"`
	QueryParameters map[string]string `json:"query_parameters"`
	SQL             string            `json:"sql"`
	Performance     string            `json:"performance"`
	ColumnMap       ColumnMap         `json:"column_map"`
}

// ColumnMap maps Dune result columns to bronze fields.
type ColumnMap struct {
	ObservationID string `json:"observation_id"`
	AssetID       string `json:"asset_id"`
	Label         string `json:"label"`
	Value         string `json:"value"`
	Unit          string `json:"unit"`
	ObservedAt    string `json:"observed_at"`
}

var (
	partitionRe  = regexp.MustCompile(`(?i)\b(block_date|block_time|block_timestamp)\b`)
	largeTableRe = regexp.MustCompile(`(?i)\b(ethereum\.transactions|ethereum\.logs|ethereum\.traces|solana\.transactions)\b`)
)

// ValidateParams validates connector-specific job params before persistence.
func ValidateParams(connector string, raw json.RawMessage) error {
	switch connector {
	case "seed-csv", "":
		return nil
	case "sim-dune":
		var p SimParams
		if len(raw) == 0 || string(raw) == "null" {
			return fmt.Errorf("params required for sim-dune")
		}
		if err := json.Unmarshal(raw, &p); err != nil {
			return fmt.Errorf("invalid sim-dune params: %w", err)
		}
		if len(p.Addresses) == 0 {
			return fmt.Errorf("addresses required")
		}
		if len(p.Sources) == 0 {
			p.Sources = []string{"balances"}
		}
		for _, src := range p.Sources {
			switch src {
			case "balances", "activity", "transactions":
			default:
				return fmt.Errorf("unknown source %q", src)
			}
		}
		hasEVM := false
		hasSVM := false
		for _, a := range p.Addresses {
			if strings.HasPrefix(strings.ToLower(a), "0x") {
				hasEVM = true
			} else if len(a) >= 32 {
				hasSVM = true
			}
		}
		if hasEVM && len(p.ChainIDs) == 0 {
			return fmt.Errorf("chain_ids required for EVM addresses")
		}
		if hasSVM && p.SVMChain == "" {
			p.SVMChain = "solana"
		}
		if p.LimitPerAddress <= 0 {
			p.LimitPerAddress = 100
		}
		if p.LimitPerAddress > 1000 {
			return fmt.Errorf("limit_per_address must be <= 1000")
		}
		return nil
	case "dune-sql":
		var p DuneSQLParams
		if len(raw) == 0 || string(raw) == "null" {
			return fmt.Errorf("params required for dune-sql")
		}
		if err := json.Unmarshal(raw, &p); err != nil {
			return fmt.Errorf("invalid dune-sql params: %w", err)
		}
		if p.ColumnMap.ObservationID == "" || p.ColumnMap.AssetID == "" || p.ColumnMap.Label == "" ||
			p.ColumnMap.Value == "" || p.ColumnMap.ObservedAt == "" {
			return fmt.Errorf("column_map must include observation_id, asset_id, label, value, observed_at")
		}
		mode := strings.ToLower(strings.TrimSpace(p.Mode))
		if mode == "" {
			mode = "query_id"
		}
		switch mode {
		case "query_id":
			if p.QueryID <= 0 {
				return fmt.Errorf("query_id required for mode query_id")
			}
		case "execute_sql":
			sql := strings.TrimSpace(p.SQL)
			if sql == "" {
				return fmt.Errorf("sql required for mode execute_sql")
			}
			if largeTableRe.MatchString(sql) && !partitionRe.MatchString(sql) {
				return fmt.Errorf("execute_sql on large tables requires block_date or block_time in WHERE")
			}
		default:
			return fmt.Errorf("unknown mode %q", p.Mode)
		}
		return nil
	default:
		return fmt.Errorf("unknown connector: %s", connector)
	}
}

// RedactParams returns a copy safe for API responses (truncate addresses).
func RedactParams(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return json.RawMessage(`{}`)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return raw
	}
	if addrs, ok := m["addresses"].([]any); ok {
		out := make([]string, 0, len(addrs))
		for _, a := range addrs {
			s, _ := a.(string)
			out = append(out, redactAddress(s))
		}
		m["addresses"] = out
	}
	if sql, ok := m["sql"].(string); ok && len(sql) > 200 {
		m["sql"] = sql[:200] + "…"
	}
	b, _ := json.Marshal(m)
	return b
}

func redactAddress(s string) string {
	if len(s) <= 12 {
		return "***"
	}
	return s[:6] + "…" + s[len(s)-4:]
}
