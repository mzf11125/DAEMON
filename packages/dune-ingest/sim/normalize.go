package sim

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/daemon-platform/daemon/packages/dune-ingest/bronze"
)

const connectorID = "sim-dune"

func parseEVMBalances(address string, chainIDs []int, body []byte, now time.Time) []bronze.Row {
	var resp struct {
		Balances []struct {
			Chain          json.Number `json:"chain"`
			ChainID        int         `json:"chain_id"`
			TokenAddress   string      `json:"token_address"`
			Symbol         string      `json:"symbol"`
			Amount         string      `json:"amount"`
			AmountUSD      float64     `json:"amount_usd"`
			ValueUSD       float64     `json:"value_usd"`
			LastUpdated    string      `json:"last_updated"`
		} `json:"balances"`
	}
	_ = json.Unmarshal(body, &resp)
	rows := make([]bronze.Row, 0, len(resp.Balances))
	for _, b := range resp.Balances {
		chainKey := chainKeyFromBalance(b.ChainID, b.Chain.String(), chainIDs)
		val := b.AmountUSD
		if val == 0 {
			val = b.ValueUSD
		}
		if val == 0 && b.Amount != "" {
			val, _ = strconv.ParseFloat(b.Amount, 64)
		}
		asset := address
		if b.TokenAddress != "" {
			asset = address + ":" + strings.ToLower(b.TokenAddress)
		}
		label := "balance_usd"
		if b.Symbol != "" {
			label = "balance_" + strings.ToLower(b.Symbol)
		}
		ts := parseTime(b.LastUpdated, now)
		eventKey := chainKey + "|balance|" + b.TokenAddress
		rows = append(rows, bronze.Row{
			ObservationID: bronze.ObservationID(connectorID, chainKey, eventKey, asset, label),
			AssetID:       asset,
			Label:         label,
			Value:         val,
			Unit:          "usd",
			ObservedAt:    ts,
		})
	}
	return rows
}

func parseEVMActivity(address string, chainIDs []int, body []byte, now time.Time) []bronze.Row {
	var resp struct {
		Activity []struct {
			ChainID     int     `json:"chain_id"`
			Chain       string  `json:"chain"`
			TxHash      string  `json:"tx_hash"`
			Type        string  `json:"type"`
			ValueUSD    float64 `json:"value_usd"`
			AmountUSD   float64 `json:"amount_usd"`
			BlockTime   string  `json:"block_time"`
			TokenSymbol string  `json:"token_symbol"`
		} `json:"activity"`
	}
	_ = json.Unmarshal(body, &resp)
	rows := make([]bronze.Row, 0, len(resp.Activity))
	for _, a := range resp.Activity {
		chainKey := chainKeyFromBalance(a.ChainID, a.Chain, chainIDs)
		val := a.ValueUSD
		if val == 0 {
			val = a.AmountUSD
		}
		label := "activity"
		if a.Type != "" {
			label = "activity_" + strings.ToLower(a.Type)
		}
		if a.TokenSymbol != "" {
			label += "_" + strings.ToLower(a.TokenSymbol)
		}
		ts := parseTime(a.BlockTime, now)
		eventKey := chainKey + "|" + a.TxHash + "|" + a.Type
		rows = append(rows, bronze.Row{
			ObservationID: bronze.ObservationID(connectorID, chainKey, eventKey, address, label),
			AssetID:       address,
			Label:         label,
			Value:         val,
			Unit:          "usd",
			ObservedAt:    ts,
		})
	}
	return rows
}

func parseEVMTransactions(address string, chainIDs []int, body []byte, now time.Time) []bronze.Row {
	var resp struct {
		Transactions []struct {
			ChainID   int     `json:"chain_id"`
			Chain     string  `json:"chain"`
			Hash      string  `json:"hash"`
			ValueUSD  float64 `json:"value_usd"`
			BlockTime string  `json:"block_time"`
		} `json:"transactions"`
	}
	_ = json.Unmarshal(body, &resp)
	rows := make([]bronze.Row, 0, len(resp.Transactions))
	for _, t := range resp.Transactions {
		chainKey := chainKeyFromBalance(t.ChainID, t.Chain, chainIDs)
		label := "tx_value_usd"
		ts := parseTime(t.BlockTime, now)
		eventKey := chainKey + "|" + t.Hash
		rows = append(rows, bronze.Row{
			ObservationID: bronze.ObservationID(connectorID, chainKey, eventKey, address, label),
			AssetID:       address,
			Label:         label,
			Value:         t.ValueUSD,
			Unit:          "usd",
			ObservedAt:    ts,
		})
	}
	return rows
}

func parseSVMBalances(address, svmChain string, body []byte, now time.Time) []bronze.Row {
	var resp struct {
		Balances []struct {
			Chain       string  `json:"chain"`
			Mint        string  `json:"mint"`
			Symbol      string  `json:"symbol"`
			Amount      string  `json:"amount"`
			ValueUSD    float64 `json:"value_usd"`
			AmountUSD   float64 `json:"amount_usd"`
			LastUpdated string  `json:"last_updated"`
		} `json:"balances"`
	}
	_ = json.Unmarshal(body, &resp)
	chainKey := svmChain
	if chainKey == "" {
		chainKey = "solana"
	}
	rows := make([]bronze.Row, 0, len(resp.Balances))
	for _, b := range resp.Balances {
		if b.Chain != "" {
			chainKey = b.Chain
		}
		val := b.ValueUSD
		if val == 0 {
			val = b.AmountUSD
		}
		asset := address
		if b.Mint != "" {
			asset = address + ":" + b.Mint
		}
		label := "balance_usd"
		if b.Symbol != "" {
			label = "balance_" + strings.ToLower(b.Symbol)
		}
		ts := parseTime(b.LastUpdated, now)
		eventKey := chainKey + "|balance|" + b.Mint
		rows = append(rows, bronze.Row{
			ObservationID: bronze.ObservationID(connectorID, chainKey, eventKey, asset, label),
			AssetID:       asset,
			Label:         label,
			Value:         val,
			Unit:          "usd",
			ObservedAt:    ts,
		})
	}
	return rows
}

func parseSVMTransactions(address, svmChain string, body []byte, now time.Time) []bronze.Row {
	var resp struct {
		Transactions []struct {
			Chain     string `json:"chain"`
			Signature string `json:"signature"`
			BlockTime int64  `json:"block_time"`
		} `json:"transactions"`
	}
	_ = json.Unmarshal(body, &resp)
	chainKey := svmChain
	if chainKey == "" {
		chainKey = "solana"
	}
	rows := make([]bronze.Row, 0, len(resp.Transactions))
	for _, t := range resp.Transactions {
		if t.Chain != "" {
			chainKey = t.Chain
		}
		ts := now
		if t.BlockTime > 0 {
			// Sim SVM block_time is often microseconds.
			if t.BlockTime > 1_000_000_000_000 {
				ts = time.UnixMicro(t.BlockTime).UTC()
			} else {
				ts = time.Unix(t.BlockTime, 0).UTC()
			}
		}
		label := "tx_count"
		eventKey := chainKey + "|" + t.Signature
		rows = append(rows, bronze.Row{
			ObservationID: bronze.ObservationID(connectorID, chainKey, eventKey, address, label),
			AssetID:       address,
			Label:         label,
			Value:         1,
			Unit:          "count",
			ObservedAt:    ts,
		})
	}
	return rows
}

func chainKeyFromBalance(chainID int, chainName string, fallback []int) string {
	if chainID > 0 {
		return strconv.Itoa(chainID)
	}
	if chainName != "" {
		return strings.ToLower(chainName)
	}
	if len(fallback) == 1 {
		return strconv.Itoa(fallback[0])
	}
	return "evm"
}

func parseTime(s string, fallback time.Time) time.Time {
	if s == "" {
		return fallback
	}
	for _, layout := range []string{time.RFC3339, time.RFC3339Nano, "2006-01-02T15:04:05Z"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC()
		}
	}
	return fallback
}
