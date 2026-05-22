package sim

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/daemon-platform/daemon/packages/dune-ingest/bronze"
	"github.com/daemon-platform/daemon/packages/dune-ingest/ingestparams"
)

// Run ingests Sim API data into bronze raw_observations.
func Run(ctx context.Context, cfg ingestparams.RunConfig, raw json.RawMessage) error {
	if cfg.SimAPIKey == "" {
		return fmt.Errorf("SIM_API_KEY is not configured")
	}
	var p ingestparams.SimParams
	if err := json.Unmarshal(raw, &p); err != nil {
		return fmt.Errorf("parse sim params: %w", err)
	}
	if len(p.Sources) == 0 {
		p.Sources = []string{"balances"}
	}
	if p.LimitPerAddress <= 0 {
		p.LimitPerAddress = 100
	}
	if p.SVMChain == "" {
		p.SVMChain = "solana"
	}

	client := NewClient(cfg.SimBaseURL, cfg.SimAPIKey, cfg.HTTPTimeout)
	now := time.Now().UTC()
	var rows []bronze.Row

	for _, addr := range p.Addresses {
		addr = strings.TrimSpace(addr)
		if addr == "" {
			continue
		}
		isEVM := strings.HasPrefix(addr, "0x") && len(addr) == 42
		for _, src := range p.Sources {
			switch src {
			case "balances":
				if isEVM {
					body, err := client.EVMBalances(ctx, addr, p.ChainIDs, p.LimitPerAddress)
					if err != nil {
						return fmt.Errorf("evm balances %s: %w", addr, err)
					}
					rows = append(rows, parseEVMBalances(addr, p.ChainIDs, body, now)...)
				} else {
					body, err := client.SVMBalances(ctx, addr, p.SVMChain, p.LimitPerAddress)
					if err != nil {
						return fmt.Errorf("svm balances %s: %w", addr, err)
					}
					rows = append(rows, parseSVMBalances(addr, p.SVMChain, body, now)...)
				}
			case "activity":
				if !isEVM {
					return fmt.Errorf("activity source is EVM-only; address %s is not EVM", addr)
				}
				body, err := client.EVMActivity(ctx, addr, p.ChainIDs, p.LimitPerAddress)
				if err != nil {
					return fmt.Errorf("evm activity %s: %w", addr, err)
				}
				rows = append(rows, parseEVMActivity(addr, p.ChainIDs, body, now)...)
			case "transactions":
				if isEVM {
					body, err := client.EVMTransactions(ctx, addr, p.ChainIDs, p.LimitPerAddress)
					if err != nil {
						return fmt.Errorf("evm transactions %s: %w", addr, err)
					}
					rows = append(rows, parseEVMTransactions(addr, p.ChainIDs, body, now)...)
				} else {
					body, err := client.SVMTransactions(ctx, addr, p.LimitPerAddress)
					if err != nil {
						return fmt.Errorf("svm transactions %s: %w", addr, err)
					}
					rows = append(rows, parseSVMTransactions(addr, p.SVMChain, body, now)...)
				}
			}
		}
	}

	if err := bronze.Insert(ctx, cfg.ClickHouseDSN, rows); err != nil {
		return err
	}
	return nil
}
