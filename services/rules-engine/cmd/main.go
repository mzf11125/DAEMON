package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/config"
	"github.com/daemon-platform/daemon/packages/go-common/db"
	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/daemon-platform/daemon/packages/go-common/rules"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	cfg := config.LoadBase(8083)
	rulesRoot := os.Getenv("RULES_ROOT")
	if rulesRoot == "" {
		rulesRoot = filepath.Join("..", "..", "ontology", "v2-compiled", "rules")
	}
	ctx := context.Background()
	pool, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres")
	}
	defer pool.Close()
	ch, err := db.NewClickHouse(ctx, cfg.ClickHouseDSN)
	if err != nil {
		log.Fatal().Err(err).Msg("clickhouse")
	}
	defer ch.Close()

	r := chi.NewRouter()
	for _, mw := range dhttp.AuthenticatedStack(auth.LoadConfigFromEnv()) {
		r.Use(mw)
	}
	r.Use(middleware.Timeout(60 * time.Second))
	dhttp.MountHealth(r, "rules-engine")
	r.Post("/v1/evaluate", evaluateHandler(pool, ch, rulesRoot))

	srv := &http.Server{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: r}
	go func() {
		log.Info().Int("port", cfg.HTTPPort).Msg("rules-engine listening")
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

func evaluateHandler(pool *pgxpool.Pool, ch clickhouse.Conn, rulesRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		entries, err := os.ReadDir(rulesRoot)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "RULES_LOAD_FAILED", err.Error())
			return
		}
		var created []map[string]any
		for _, e := range entries {
			if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
				continue
			}
			b, err := os.ReadFile(filepath.Join(rulesRoot, e.Name()))
			if err != nil {
				continue
			}
			var rule rules.RuleDef
			if err := json.Unmarshal(b, &rule); err != nil {
				continue
			}
			if err := rules.ValidateRuleFile(rule); err != nil {
				log.Warn().Err(err).Str("rule", rule.ID).Msg("skip invalid rule")
				continue
			}
			rendered, err := rules.RenderSQL(rule, tenant)
			if err != nil {
				continue
			}
			if err := rules.ValidateSQL(rendered); err != nil {
				continue
			}

			ruleCreated := 0
			rows, err := ch.Query(r.Context(), rendered)
			if err != nil {
				log.Warn().Err(err).Str("rule", rule.ID).Msg("clickhouse query failed")
				_ = db.ExecRLS(r.Context(), pool, `INSERT INTO rule_runs (tenant_id, rule_id, matched_count) VALUES ($1,$2,$3)`,
					tenant, rule.ID, 0)
				continue
			}
			for rows.Next() {
				var obsID, assetID string
				var value float64
				if err := rows.Scan(&obsID, &assetID, &value); err != nil {
					continue
				}
				signalID := fmt.Sprintf("sig-rule-%s-%s", rule.ID, obsID)
				summary := fmt.Sprintf("Rule %s: %s exceeded threshold (%.1f)", rule.ID, obsID, value)
				severity := rule.SignalSeverity
				if severity == "" {
					severity = "medium"
				}
				props, _ := json.Marshal(map[string]any{
					"signalId": signalID, "summary": summary, "severity": severity,
					"status": "open", "priority": "P2", "assetId": assetID,
					"provenanceRuleId": rule.ID,
					"vertical": expressVerticalForRule(rule.ID),
				})
				rid := "ri." + tenant + ".signal." + signalID
				err = db.ExecRLS(r.Context(), pool, `
					INSERT INTO ontology_objects (object_rid, tenant_id, object_type, primary_key_value, properties, created_at, updated_at)
					VALUES ($1,$2,'Signal',$3,$4,NOW(),NOW()) ON CONFLICT (object_rid) DO UPDATE SET properties = EXCLUDED.properties`,
					rid, tenant, signalID, props)
				if err == nil {
					created = append(created, map[string]any{"signalId": signalID, "ruleId": rule.ID, "observationId": obsID})
					ruleCreated++
				}
			}
			rows.Close()
			_ = db.ExecRLS(r.Context(), pool, `INSERT INTO rule_runs (tenant_id, rule_id, matched_count) VALUES ($1,$2,$3)`,
				tenant, rule.ID, ruleCreated)
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{"signalsCreated": created, "count": len(created)})
	}
}

func expressVerticalForRule(ruleID string) string {
	switch ruleID {
	case "express-leg-sla-breach", "express-routing-anomaly", "express-champion-idle":
		return "logistics-express-cargo"
	default:
		return ""
	}
}
