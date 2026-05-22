package db

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/ctxkeys"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// WithRLSTx runs fn inside a transaction with Supabase-compatible JWT claims set for RLS.
func WithRLSTx(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {
	claimsJSON, err := claimsJSONForContext(ctx)
	if err != nil {
		return err
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `SET LOCAL role authenticated`); err != nil {
		return fmt.Errorf("set role authenticated: %w", err)
	}
	if _, err := tx.Exec(ctx, `SELECT set_config('request.jwt.claims', $1, true)`, claimsJSON); err != nil {
		return fmt.Errorf("set jwt claims: %w", err)
	}
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func claimsJSONForContext(ctx context.Context) (string, error) {
	if c, ok := auth.ClaimsFromContext(ctx); ok && c != nil {
		return c.JSONForRLS(), nil
	}
	tenant := ""
	if v, ok := ctx.Value(ctxkeys.TenantID).(string); ok {
		tenant = v
	}
	if tenant != "" {
		b, err := json.Marshal(map[string]any{
			"role":      "authenticated",
			"tenant_id": tenant,
		})
		if err != nil {
			return "", err
		}
		return string(b), nil
	}
	return "{}", nil
}

// ExecRLS runs a single statement inside an RLS-scoped transaction.
func ExecRLS(ctx context.Context, pool *pgxpool.Pool, sql string, args ...any) error {
	return WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, sql, args...)
		return err
	})
}

