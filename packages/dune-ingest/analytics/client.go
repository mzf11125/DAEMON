package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client calls Dune Analytics API v1.
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

func (c *Client) do(ctx context.Context, method, path string, body any) ([]byte, int, error) {
	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
		rdr = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, rdr)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-Dune-Api-Key", c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	if resp.StatusCode >= 400 {
		return data, resp.StatusCode, fmt.Errorf("dune api %s: %d %s", path, resp.StatusCode, truncate(string(data), 512))
	}
	return data, resp.StatusCode, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

type executeResponse struct {
	ExecutionID string `json:"execution_id"`
	State       string `json:"state"`
}

// ExecuteQuery runs a saved query by id.
func (c *Client) ExecuteQuery(ctx context.Context, queryID int64, params map[string]string) (string, error) {
	body := map[string]any{}
	if len(params) > 0 {
		body["query_parameters"] = params
	}
	data, _, err := c.do(ctx, http.MethodPost, fmt.Sprintf("/query/%d/execute", queryID), body)
	if err != nil {
		return "", err
	}
	var er executeResponse
	if err := json.Unmarshal(data, &er); err != nil {
		return "", err
	}
	if er.ExecutionID == "" {
		return "", fmt.Errorf("missing execution_id in execute response")
	}
	return er.ExecutionID, nil
}

// ExecuteSQL runs ad-hoc SQL.
func (c *Client) ExecuteSQL(ctx context.Context, sql, performance string) (string, error) {
	if performance == "" {
		performance = "medium"
	}
	payload := map[string]string{
		"sql":         sql,
		"performance": performance,
	}
	data, _, err := c.do(ctx, http.MethodPost, "/sql/execute", payload)
	if err != nil {
		return "", err
	}
	var er executeResponse
	if err := json.Unmarshal(data, &er); err != nil {
		return "", err
	}
	if er.ExecutionID == "" {
		return "", fmt.Errorf("missing execution_id in sql execute response")
	}
	return er.ExecutionID, nil
}

type statusResponse struct {
	State string `json:"state"`
}

// WaitExecution polls until execution completes or fails.
func (c *Client) WaitExecution(ctx context.Context, executionID string, pollInterval time.Duration) error {
	if pollInterval <= 0 {
		pollInterval = 2 * time.Second
	}
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		data, _, err := c.do(ctx, http.MethodGet, "/execution/"+executionID+"/status", nil)
		if err != nil {
			return err
		}
		var st statusResponse
		if err := json.Unmarshal(data, &st); err != nil {
			return err
		}
		switch st.State {
		case "QUERY_STATE_COMPLETED":
			return nil
		case "QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED", "QUERY_STATE_EXPIRED":
			return fmt.Errorf("execution %s ended with state %s", executionID, st.State)
		}
		time.Sleep(pollInterval)
	}
}

type resultsResponse struct {
	Result struct {
		Rows []map[string]any `json:"rows"`
	} `json:"result"`
}

// FetchResults returns result rows (paginated fetch up to maxRows).
func (c *Client) FetchResults(ctx context.Context, executionID string, maxRows int) ([]map[string]any, error) {
	var all []map[string]any
	offset := 0
	limit := 25_000
	if maxRows > 0 && maxRows < limit {
		limit = maxRows
	}
	for {
		path := fmt.Sprintf("/execution/%s/results?limit=%d&offset=%d", executionID, limit, offset)
		data, _, err := c.do(ctx, http.MethodGet, path, nil)
		if err != nil {
			return nil, err
		}
		var rr resultsResponse
		if err := json.Unmarshal(data, &rr); err != nil {
			return nil, err
		}
		chunk := rr.Result.Rows
		if len(chunk) == 0 {
			break
		}
		all = append(all, chunk...)
		if maxRows > 0 && len(all) >= maxRows {
			all = all[:maxRows]
			break
		}
		if len(chunk) < limit {
			break
		}
		offset += len(chunk)
	}
	return all, nil
}
