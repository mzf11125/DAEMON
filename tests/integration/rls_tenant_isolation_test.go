//go:build integration

package integration_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRLSTenantIsolation(t *testing.T) {
	runtimeDSN := envOr("DATABASE_URL", "postgresql://daemon_runtime:daemon_runtime_local@127.0.0.1:54332/postgres?sslmode=disable")
	seedDSN := envOr("SEED_DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable")
	supabaseURL := envOr("SUPABASE_URL", "http://127.0.0.1:54331")
	anonKey := os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
	if anonKey == "" {
		t.Skip("NEXT_PUBLIC_SUPABASE_ANON_KEY not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	seedPool, err := pgxpool.New(ctx, seedDSN)
	if err != nil {
		t.Skipf("postgres not available: %v", err)
	}
	defer seedPool.Close()

	runtimePool, err := pgxpool.New(ctx, runtimeDSN)
	if err != nil {
		t.Fatalf("runtime pool: %v", err)
	}
	defer runtimePool.Close()

	const caseA = "case-rls-test-a"
	const caseB = "case-rls-test-b"
	_, _ = seedPool.Exec(ctx, `DELETE FROM cases WHERE case_id IN ($1,$2)`, caseA, caseB)
	if _, err := seedPool.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status) VALUES ($1,$2,$3,$4)`,
		caseA, "tenant-rls-a", "RLS A", "open"); err != nil {
		t.Fatalf("seed case A: %v", err)
	}
	if _, err := seedPool.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status) VALUES ($1,$2,$3,$4)`,
		caseB, "tenant-rls-b", "RLS B", "open"); err != nil {
		t.Fatalf("seed case B: %v", err)
	}
	t.Cleanup(func() {
		c, _ := context.WithTimeout(context.Background(), 5*time.Second)
		_, _ = seedPool.Exec(c, `DELETE FROM cases WHERE case_id IN ($1,$2)`, caseA, caseB)
	})

	if _, err := supabasePasswordToken(ctx, supabaseURL, anonKey, "analyst@demo.local", "analyst"); err != nil {
		t.Skipf("supabase auth not ready: %v", err)
	}

	claims := &auth.Claims{Subject: "rls-test-user", TenantID: "tenant-rls-a", Roles: []string{"analyst"}}
	ctxA := auth.ContextWithClaims(ctx, claims)

	var ids []string
	err = db.WithRLSTx(ctxA, runtimePool, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `SELECT case_id FROM cases WHERE case_id IN ($1,$2)`, caseA, caseB)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				return err
			}
			ids = append(ids, id)
		}
		return rows.Err()
	})
	if err != nil {
		t.Fatalf("tenant-a RLS query: %v", err)
	}
	if len(ids) != 1 || ids[0] != caseA {
		t.Fatalf("tenant-a should see only case A, got %v", ids)
	}

	wrong := &auth.Claims{Subject: "rls-test-user", TenantID: "tenant-rls-wrong", Roles: []string{"analyst"}}
	ctxWrong := auth.ContextWithClaims(ctx, wrong)
	var wrongIDs []string
	err = db.WithRLSTx(ctxWrong, runtimePool, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `SELECT case_id FROM cases WHERE case_id IN ($1,$2)`, caseA, caseB)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				return err
			}
			wrongIDs = append(wrongIDs, id)
		}
		return rows.Err()
	})
	if err != nil {
		t.Fatalf("wrong-tenant RLS query: %v", err)
	}
	if len(wrongIDs) != 0 {
		t.Fatalf("wrong tenant must see 0 rows, got %v", wrongIDs)
	}

	var superCount int
	if err := seedPool.QueryRow(ctx, `SELECT count(*) FROM cases WHERE case_id IN ($1,$2)`, caseA, caseB).Scan(&superCount); err != nil {
		t.Fatalf("superuser count: %v", err)
	}
	if superCount != 2 {
		t.Fatalf("negative control: superuser should see 2 rows, got %d", superCount)
	}
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func supabasePasswordToken(ctx context.Context, base, anonKey, email, password string) (string, error) {
	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		strings.TrimRight(base, "/")+"/auth/v1/token?grant_type=password", strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("apikey", anonKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token status %d: %s", resp.StatusCode, string(b))
	}
	var out struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return "", err
	}
	if out.AccessToken == "" {
		return "", fmt.Errorf("empty access_token")
	}
	return out.AccessToken, nil
}
