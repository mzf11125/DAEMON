package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/config"
	"github.com/daemon-platform/daemon/packages/go-common/db"
	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	cfg := config.LoadBase(8084)
	ctx := context.Background()
	pool, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres")
	}
	defer pool.Close()

	r := chi.NewRouter()
	for _, mw := range dhttp.AuthenticatedStack(auth.LoadConfigFromEnv()) {
		r.Use(mw)
	}
	r.Use(middleware.Timeout(30 * time.Second))
	dhttp.MountHealth(r, "case-service")
	r.Get("/v1/cases", listCases(pool))
	r.Get("/v1/cases/{caseId}", getCase(pool))

	srv := &http.Server{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: r}
	go func() {
		log.Info().Int("port", cfg.HTTPPort).Msg("case-service listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("listen")
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	shutdown, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	_ = srv.Shutdown(shutdown)
}

func listCases(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, offset := dhttp.ParseListPagination(r)
		var cases []map[string]any
		var total int
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			if err := tx.QueryRow(r.Context(), `SELECT COUNT(*) FROM cases`).Scan(&total); err != nil {
				return err
			}
			rows, err := tx.Query(r.Context(),
				`SELECT case_id, title, status, owner_id, priority, opened_at FROM cases ORDER BY opened_at DESC NULLS LAST LIMIT $1 OFFSET $2`,
				limit, offset)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var id, title, status, owner, priority string
				var opened *time.Time
				_ = rows.Scan(&id, &title, &status, &owner, &priority, &opened)
				cases = append(cases, map[string]any{"caseId": id, "title": title, "status": status, "ownerId": owner, "priority": priority})
			}
			return rows.Err()
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		if cases == nil {
			cases = []map[string]any{}
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"items": cases,
			"meta":  dhttp.ListMeta(total, limit, offset, len(cases)),
		})
	}
}

func getCase(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		caseID := chi.URLParam(r, "caseId")
		var title, status, owner, priority string
		var opened *time.Time
		var signals []string
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			if err := tx.QueryRow(r.Context(),
				`SELECT title, status, owner_id, priority, opened_at FROM cases WHERE case_id = $1`,
				caseID).Scan(&title, &status, &owner, &priority, &opened); err != nil {
				return err
			}
			rows, err := tx.Query(r.Context(), `SELECT signal_id FROM case_signals WHERE case_id = $1`, caseID)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var sid string
				_ = rows.Scan(&sid)
				signals = append(signals, sid)
			}
			return rows.Err()
		})
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "case not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"caseId": caseID, "title": title, "status": status, "ownerId": owner, "priority": priority, "signalIds": signals,
		})
	}
}
