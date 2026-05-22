package sim

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Client calls Sim by Dune HTTP APIs.
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

func NewClient(baseURL, apiKey string, timeout time.Duration) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) get(ctx context.Context, path string, q url.Values) ([]byte, error) {
	u := c.BaseURL + path
	if len(q) > 0 {
		u += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Sim-Api-Key", c.APIKey)
	req.Header.Set("Accept", "application/json")
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("sim api %s: %d %s", path, resp.StatusCode, truncate(string(body), 512))
	}
	return body, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// EVMBalances fetches token balances for an EVM address.
func (c *Client) EVMBalances(ctx context.Context, address string, chainIDs []int, limit int) ([]byte, error) {
	q := url.Values{}
	if len(chainIDs) > 0 {
		parts := make([]string, len(chainIDs))
		for i, id := range chainIDs {
			parts[i] = strconv.Itoa(id)
		}
		q.Set("chain_ids", strings.Join(parts, ","))
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return c.get(ctx, "/v1/evm/balances/"+address, q)
}

// EVMActivity fetches activity for an EVM address.
func (c *Client) EVMActivity(ctx context.Context, address string, chainIDs []int, limit int) ([]byte, error) {
	q := url.Values{}
	if len(chainIDs) > 0 {
		parts := make([]string, len(chainIDs))
		for i, id := range chainIDs {
			parts[i] = strconv.Itoa(id)
		}
		q.Set("chain_ids", strings.Join(parts, ","))
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return c.get(ctx, "/v1/evm/activity/"+address, q)
}

// EVMTransactions fetches transactions for an EVM address.
func (c *Client) EVMTransactions(ctx context.Context, address string, chainIDs []int, limit int) ([]byte, error) {
	q := url.Values{}
	if len(chainIDs) > 0 {
		parts := make([]string, len(chainIDs))
		for i, id := range chainIDs {
			parts[i] = strconv.Itoa(id)
		}
		q.Set("chain_ids", strings.Join(parts, ","))
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return c.get(ctx, "/v1/evm/transactions/"+address, q)
}

// SVMBalances fetches SVM balances (Solana/Eclipse).
func (c *Client) SVMBalances(ctx context.Context, address, chains string, limit int) ([]byte, error) {
	q := url.Values{}
	if chains != "" {
		q.Set("chains", chains)
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return c.get(ctx, "/beta/svm/balances/"+address, q)
}

// SVMTransactions fetches SVM transactions.
func (c *Client) SVMTransactions(ctx context.Context, address string, limit int) ([]byte, error) {
	q := url.Values{}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return c.get(ctx, "/beta/svm/transactions/"+address, q)
}

// DecodeWarnings extracts optional API warnings from Sim responses.
func DecodeWarnings(body []byte) []string {
	var envelope struct {
		Warnings []struct {
			Message string `json:"message"`
		} `json:"warnings"`
	}
	_ = json.Unmarshal(body, &envelope)
	out := make([]string, 0, len(envelope.Warnings))
	for _, w := range envelope.Warnings {
		if w.Message != "" {
			out = append(out, w.Message)
		}
	}
	return out
}
