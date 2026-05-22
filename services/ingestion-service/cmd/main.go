package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/daemon-platform/daemon/packages/dune-ingest/ingestparams"
	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/config"
	"github.com/daemon-platform/daemon/packages/go-common/db"
	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	pipelinerunner "github.com/daemon-platform/daemon/packages/pipeline-runner"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	cfg := config.LoadBase(8082)
	ctx := context.Background()
	pool, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres")
	}
	defer pool.Close()

	repoRoot, err := pipelinerunner.ResolveRepoRoot()
	if err != nil {
		log.Fatal().Err(err).Msg("repo root")
	}

	r := chi.NewRouter()
	for _, mw := range dhttp.AuthenticatedStack(auth.LoadConfigFromEnv()) {
		r.Use(mw)
	}
	r.Use(middleware.Timeout(30 * time.Second))
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		dhttp.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "ingestion-service"})
	})
	r.Route("/v1", func(r chi.Router) {
		r.Post("/jobs", createJob(pool, cfg, repoRoot))
		r.Get("/jobs/{jobId}", getJob(pool))
	})

	srv := &http.Server{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: r}
	go func() {
		log.Info().Int("port", cfg.HTTPPort).Msg("ingestion-service listening")
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

func createJob(pool *pgxpool.Pool, cfg config.Base, repoRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		var body struct {
			Connector string          `json:"connector"`
			Params    json.RawMessage `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_BODY", err.Error())
			return
		}
		if body.Connector == "" {
			body.Connector = "seed-csv"
		}
		if body.Params == nil {
			body.Params = json.RawMessage(`{}`)
		}
		if err := ingestparams.ValidateParams(body.Connector, body.Params); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_CONNECTOR_PARAMS", err.Error())
			return
		}
		jobID := uuid.New().String()
		err := db.ExecRLS(r.Context(), pool,
			`INSERT INTO ingestion_jobs (job_id, tenant_id, connector, status, params, created_at) VALUES ($1,$2,$3,'pending',$4,NOW())`,
			jobID, tenant, body.Connector, body.Params)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "JOB_CREATE_FAILED", err.Error())
			return
		}
		go finishJob(context.WithoutCancel(r.Context()), pool, jobID, tenant, body.Connector, body.Params, cfg, repoRoot)
		dhttp.WriteJSON(w, http.StatusAccepted, map[string]any{"jobId": jobID, "status": "pending"})
	}
}

func finishJob(parentCtx context.Context, pool *pgxpool.Pool, jobID, tenant, connector string, params json.RawMessage, cfg config.Base, repoRoot string) {
	ctx, cancel := context.WithTimeout(parentCtx, 5*time.Minute)
	defer cancel()

	err := db.ExecRLS(ctx, pool, `UPDATE ingestion_jobs SET status = 'running' WHERE job_id = $1 AND tenant_id = $2`, jobID, tenant)
	if err != nil {
		log.Error().Err(err).Str("job", jobID).Msg("mark running")
		return
	}

	runCfg := pipelinerunner.Config{
		ClickHouseDSN: cfg.ClickHouseDSN,
		RepoRoot:      repoRoot,
		TenantID:      tenant,
	}
	if err := pipelinerunner.RunConnector(ctx, runCfg, connector, params); err != nil {
		msg := err.Error()
		_ = db.ExecRLS(ctx, pool,
			`UPDATE ingestion_jobs SET status = 'failed', error_message = $3, finished_at = NOW() WHERE job_id = $1 AND tenant_id = $2`,
			jobID, tenant, msg)
		log.Error().Err(err).Str("job", jobID).Msg("pipeline failed")
		return
	}

	lineageSource := lineageSourceForConnector(connector)
	err = db.ExecRLS(ctx, pool,
		`INSERT INTO lineage_events (event_id, tenant_id, dataset_name, source, target, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		uuid.New().String(), tenant, connector, lineageSource, "daemon.dataset_observations")
	if err != nil {
		log.Warn().Err(err).Str("job", jobID).Msg("lineage insert")
	}

	err = db.ExecRLS(ctx, pool,
		`UPDATE ingestion_jobs SET status = 'completed', finished_at = NOW() WHERE job_id = $1 AND tenant_id = $2`,
		jobID, tenant)
	if err != nil {
		log.Error().Err(err).Str("job", jobID).Msg("mark completed")
	}
}

func lineageSourceForConnector(connector string) string {
	switch connector {
	case "sim-dune":
		return "api.sim.dune.com"
	case "dune-sql":
		return "api.dune.com"
	case "seed-csv":
		return "connectors/seed-data"
	default:
		return connector
	}
}

func getJob(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		jobID := chi.URLParam(r, "jobId")
		var status, connector, errMsg string
		var params json.RawMessage
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(),
				`SELECT status, connector, COALESCE(error_message,''), COALESCE(params, '{}'::jsonb) FROM ingestion_jobs WHERE job_id = $1 AND tenant_id = $2`,
				jobID, tenant).Scan(&status, &connector, &errMsg, &params)
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "JOB_NOT_FOUND", "job not found")
			return
		}
		out := map[string]any{
			"jobId":     jobID,
			"status":    status,
			"connector": connector,
			"params":    json.RawMessage(ingestparams.RedactParams(params)),
		}
		if errMsg != "" {
			out["errorMessage"] = errMsg
		}
		dhttp.WriteJSON(w, http.StatusOK, out)
	}
}
