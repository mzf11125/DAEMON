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
	"strings"
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
	neo4j "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	cfg := config.LoadBase(8081)
	if v := os.Getenv("ONTOLOGY_ROOT"); v != "" {
		cfg.OntologyRoot = v
	} else {
		cfg.OntologyRoot = filepath.Join("..", "..", "ontology", "v2")
	}
	ctx := context.Background()
	pool, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres")
	}
	defer pool.Close()
	driver, err := db.NewNeo4j(ctx, cfg.Neo4jURI, cfg.Neo4jUser, cfg.Neo4jPassword)
	if err != nil {
		log.Fatal().Err(err).Msg("neo4j")
	}
	defer driver.Close(ctx)

	manifest, err := loadManifest(cfg.OntologyRoot)
	if err != nil {
		log.Fatal().Err(err).Msg("manifest")
	}

	r := chi.NewRouter()
	for _, mw := range dhttp.AuthenticatedStack(auth.LoadConfigFromEnv()) {
		r.Use(mw)
	}
	r.Use(middleware.Timeout(30 * time.Second))
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		dhttp.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "ontology-service"})
	})
	r.Get("/v1/ontology/v2/manifest", func(w http.ResponseWriter, r *http.Request) {
		dhttp.WriteJSON(w, http.StatusOK, manifest)
	})
	r.Get("/v1/objects/{objectType}", listObjects(pool))
	r.Get("/v1/objects/{objectType}/{id}", getObject(pool))
	r.Get("/v1/objects/{objectType}/{id}/links", getObjectLinks(pool))
	r.Post("/v1/actions/{actionType}", executeAction(pool, driver, cfg))
	r.Post("/v1/functions/summarizeCaseContext", summarizeCaseContextHandler(pool))

	srv := &http.Server{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: r}
	go func() {
		log.Info().Int("port", cfg.HTTPPort).Msg("ontology-service listening")
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

func loadManifest(root string) (map[string]any, error) {
	b, err := os.ReadFile(filepath.Join(root, "manifest.json"))
	if err != nil {
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	packsDir := filepath.Join(root, "examples", "packs")
	entries, _ := os.ReadDir(packsDir)
	packMeta := make([]map[string]any, 0)
	for _, ent := range entries {
		if !ent.IsDir() {
			continue
		}
		pm, err := os.ReadFile(filepath.Join(packsDir, ent.Name(), "manifest.json"))
		if err != nil {
			continue
		}
		var pack map[string]any
		if json.Unmarshal(pm, &pack) == nil {
			pack["packId"] = ent.Name()
			packMeta = append(packMeta, pack)
		}
	}
	if len(packMeta) > 0 {
		m["packs"] = packMeta
	}
	return m, nil
}

func listObjects(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		typ := chi.URLParam(r, "objectType")
		limit, offset := dhttp.ParseListPagination(r)
		var items []map[string]any
		var total int
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			if err := tx.QueryRow(r.Context(),
				`SELECT COUNT(*) FROM ontology_objects WHERE tenant_id = $1 AND object_type = $2`,
				tenant, typ).Scan(&total); err != nil {
				return err
			}
			rows, err := tx.Query(r.Context(),
				`SELECT object_rid, primary_key_value, properties FROM ontology_objects WHERE tenant_id = $1 AND object_type = $2 ORDER BY primary_key_value LIMIT $3 OFFSET $4`,
				tenant, typ, limit, offset)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var rid, pk string
				var props []byte
				if err := rows.Scan(&rid, &pk, &props); err != nil {
					continue
				}
				var p map[string]any
				_ = json.Unmarshal(props, &p)
				items = append(items, map[string]any{"rid": rid, "primaryKey": pk, "properties": p})
			}
			return rows.Err()
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		if items == nil {
			items = []map[string]any{}
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"objectType": typ,
			"items":      items,
			"meta":       dhttp.ListMeta(total, limit, offset, len(items)),
		})
	}
}

func getObject(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		typ := chi.URLParam(r, "objectType")
		id := chi.URLParam(r, "id")
		var rid, pk string
		var props []byte
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(),
				`SELECT object_rid, primary_key_value, properties FROM ontology_objects WHERE tenant_id = $1 AND object_type = $2 AND primary_key_value = $3`,
				tenant, typ, id).Scan(&rid, &pk, &props)
		})
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "object not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		var p map[string]any
		_ = json.Unmarshal(props, &p)
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{"rid": rid, "objectType": typ, "primaryKey": pk, "properties": p})
	}
}

func executeAction(pool *pgxpool.Pool, driver neo4j.DriverWithContext, cfg config.Base) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actionType := chi.URLParam(r, "actionType")
		var params map[string]any
		if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid JSON body")
			return
		}
		tenant := dhttp.TenantFromContext(r.Context())
		ctx := r.Context()
		if err := auth.AuthorizeAction(ctx, cfg.OntologyRoot, actionType); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}

		switch actionType {
		case "OpenCase":
			title, _ := params["title"].(string)
			if title == "" {
				title = "New case"
			}
			signalIDs := parseStringSliceParam(params["signalIds"])
			caseID := "case-" + strconv.FormatInt(time.Now().UnixNano(), 10)
			err := db.WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
				if _, err := tx.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, opened_at, created_at, updated_at)
					VALUES ($1,$2,$3,'open',NOW(),NOW(),NOW())`, caseID, tenant, title); err != nil {
					return err
				}
				for _, sid := range signalIDs {
					var exists int
					if err := tx.QueryRow(ctx,
						`SELECT 1 FROM ontology_objects WHERE tenant_id = $1 AND object_type = 'Signal' AND primary_key_value = $2`,
						tenant, sid).Scan(&exists); err != nil {
						if err == pgx.ErrNoRows {
							return fmt.Errorf("signal not found: %s", sid)
						}
						return err
					}
					if _, err := tx.Exec(ctx,
						`INSERT INTO case_signals (case_id, signal_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
						caseID, sid); err != nil {
						return err
					}
				}
				return nil
			})
			if err != nil {
				if strings.Contains(err.Error(), "signal not found") {
					dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "SIGNAL_NOT_FOUND", err.Error())
					return
				}
				dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "ACTION_FAILED", err.Error())
				return
			}
			props, _ := json.Marshal(map[string]any{"caseId": caseID, "title": title, "status": "open", "signalIds": signalIDs})
			rid := "ri." + tenant + ".case." + caseID
			_ = db.ExecRLS(ctx, pool, `INSERT INTO ontology_objects (object_rid, tenant_id, object_type, primary_key_value, properties, created_at, updated_at)
				VALUES ($1,$2,'Case',$3,$4,NOW(),NOW()) ON CONFLICT DO NOTHING`, rid, tenant, caseID, props)
			linkSignalsToCaseNeo4j(ctx, driver, caseID, signalIDs)
			recordAudit(pool, ctx, tenant, actionType, "Case", caseID, params)
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{"caseId": caseID, "status": "created", "signalIds": signalIDs})
		case "EscalateSignal":
			signalID, _ := params["signalId"].(string)
			severity, _ := params["severity"].(string)
			if signalID == "" {
				dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "signalId required")
				return
			}
			var props []byte
			err := db.WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
				return tx.QueryRow(ctx, `SELECT properties FROM ontology_objects WHERE tenant_id = $1 AND object_type = 'Signal' AND primary_key_value = $2`, tenant, signalID).Scan(&props)
			})
			if err != nil {
				dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "signal not found")
				return
			}
			var p map[string]any
			_ = json.Unmarshal(props, &p)
			p["severity"] = severity
			b, _ := json.Marshal(p)
			err = db.ExecRLS(ctx, pool, `UPDATE ontology_objects SET properties = $1, updated_at = NOW() WHERE tenant_id = $2 AND object_type = 'Signal' AND primary_key_value = $3`, b, tenant, signalID)
			if err != nil {
				dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "ACTION_FAILED", err.Error())
				return
			}
			recordAudit(pool, ctx, tenant, actionType, "Signal", signalID, params)
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{"signalId": signalID, "severity": severity})
		case "AssignCase":
			caseID, _ := params["caseId"].(string)
			ownerID, _ := params["ownerId"].(string)
			if caseID == "" || ownerID == "" {
				dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "caseId and ownerId required")
				return
			}
			var rowsAffected int64
			err := db.WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
				tag, err := tx.Exec(ctx, `UPDATE cases SET owner_id = $1, updated_at = NOW() WHERE tenant_id = $2 AND case_id = $3`, ownerID, tenant, caseID)
				if err != nil {
					return err
				}
				rowsAffected = tag.RowsAffected()
				return nil
			})
			if err != nil || rowsAffected == 0 {
				dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "case not found")
				return
			}
			var props []byte
			_ = db.WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
				return tx.QueryRow(ctx, `SELECT properties FROM ontology_objects WHERE tenant_id = $1 AND object_type = 'Case' AND primary_key_value = $2`, tenant, caseID).Scan(&props)
			})
			var p map[string]any
			_ = json.Unmarshal(props, &p)
			p["ownerId"] = ownerID
			b, _ := json.Marshal(p)
			_ = db.ExecRLS(ctx, pool, `UPDATE ontology_objects SET properties = $1, updated_at = NOW() WHERE tenant_id = $2 AND object_type = 'Case' AND primary_key_value = $3`, b, tenant, caseID)
			recordAudit(pool, ctx, tenant, actionType, "Case", caseID, params)
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{"caseId": caseID, "ownerId": ownerID})
		case "CloseCase":
			caseID, _ := params["caseId"].(string)
			reason, _ := params["reason"].(string)
			if caseID == "" {
				dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "caseId required")
				return
			}
			err := db.ExecRLS(ctx, pool, `UPDATE cases SET status = 'closed', updated_at = NOW() WHERE tenant_id = $1 AND case_id = $2`, tenant, caseID)
			if err != nil {
				dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "ACTION_FAILED", err.Error())
				return
			}
			var props []byte
			_ = db.WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
				return tx.QueryRow(ctx, `SELECT properties FROM ontology_objects WHERE tenant_id = $1 AND object_type = 'Case' AND primary_key_value = $2`, tenant, caseID).Scan(&props)
			})
			var p map[string]any
			_ = json.Unmarshal(props, &p)
			p["status"] = "closed"
			if reason != "" {
				p["closeReason"] = reason
			}
			b, _ := json.Marshal(p)
			_ = db.ExecRLS(ctx, pool, `UPDATE ontology_objects SET properties = $1, updated_at = NOW() WHERE tenant_id = $2 AND object_type = 'Case' AND primary_key_value = $3`, b, tenant, caseID)
			recordAudit(pool, ctx, tenant, actionType, "Case", caseID, params)
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{"caseId": caseID, "status": "closed"})
		case "RecordObservation":
			assetID, _ := params["assetId"].(string)
			label, _ := params["label"].(string)
			value, _ := params["value"].(float64)
			if assetID == "" || label == "" {
				dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "assetId and label required")
				return
			}
			obsID := "obs-" + strconv.FormatInt(time.Now().UnixNano(), 10)
			props, _ := json.Marshal(map[string]any{"observationId": obsID, "label": label, "value": value, "assetId": assetID})
			rid := "ri." + tenant + ".observation." + obsID
			err := db.ExecRLS(ctx, pool, `INSERT INTO ontology_objects (object_rid, tenant_id, object_type, primary_key_value, properties, created_at, updated_at)
				VALUES ($1,$2,'Observation',$3,$4,NOW(),NOW())`, rid, tenant, obsID, props)
			if err != nil {
				dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "ACTION_FAILED", err.Error())
				return
			}
			sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
			defer sess.Close(ctx)
			_, _ = sess.Run(ctx, `MERGE (a:Entity {id: $asset}) MERGE (b:Entity {id: $obs}) MERGE (a)-[:LINK {type: 'AssetEmitsObservation'}]->(b)`,
				map[string]any{"asset": assetID, "obs": obsID})
			recordAudit(pool, ctx, tenant, actionType, "Observation", obsID, params)
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{"observationId": obsID})
		case "RecordDecision":
			caseID, _ := params["caseId"].(string)
			outcome, _ := params["outcome"].(string)
			if caseID == "" || outcome == "" {
				dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "caseId and outcome required")
				return
			}
			decID := "dec-" + strconv.FormatInt(time.Now().UnixNano(), 10)
			props, _ := json.Marshal(map[string]any{"decisionId": decID, "caseId": caseID, "outcome": outcome})
			rid := "ri." + tenant + ".decision." + decID
			err := db.ExecRLS(ctx, pool, `INSERT INTO ontology_objects (object_rid, tenant_id, object_type, primary_key_value, properties, created_at, updated_at)
				VALUES ($1,$2,'Decision',$3,$4,NOW(),NOW())`, rid, tenant, decID, props)
			if err != nil {
				dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "ACTION_FAILED", err.Error())
				return
			}
			recordAudit(pool, ctx, tenant, actionType, "Decision", decID, params)
			recordAudit(pool, ctx, tenant, actionType, "Case", caseID, params)
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{"decisionId": decID, "outcome": outcome})
		case "ExecuteWorkOrder":
			workOrderID, _ := params["workOrderId"].(string)
			status, _ := params["status"].(string)
			if workOrderID == "" || status == "" {
				dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "workOrderId and status required")
				return
			}
			var props []byte
			err := db.WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
				return tx.QueryRow(ctx, `SELECT properties FROM ontology_objects WHERE tenant_id = $1 AND object_type = 'WorkOrder' AND primary_key_value = $2`, tenant, workOrderID).Scan(&props)
			})
			if err != nil {
				dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "work order not found")
				return
			}
			var p map[string]any
			_ = json.Unmarshal(props, &p)
			p["status"] = status
			b, _ := json.Marshal(p)
			err = db.ExecRLS(ctx, pool, `UPDATE ontology_objects SET properties = $1, updated_at = NOW() WHERE tenant_id = $2 AND object_type = 'WorkOrder' AND primary_key_value = $3`, b, tenant, workOrderID)
			if err != nil {
				dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "ACTION_FAILED", err.Error())
				return
			}
			recordAudit(pool, ctx, tenant, actionType, "WorkOrder", workOrderID, params)
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{"workOrderId": workOrderID, "status": status})
		default:
			dhttp.WriteErrorRequest(w, r, http.StatusNotImplemented, "NOT_IMPLEMENTED", "action type not implemented: "+actionType)
		}
	}
}

func parseStringSliceParam(v any) []string {
	if v == nil {
		return nil
	}
	switch arr := v.(type) {
	case []string:
		return arr
	case []any:
		out := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func linkSignalsToCaseNeo4j(ctx context.Context, driver neo4j.DriverWithContext, caseID string, signalIDs []string) {
	if len(signalIDs) == 0 {
		return
	}
	sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer sess.Close(ctx)
	for _, sid := range signalIDs {
		_, _ = sess.Run(ctx,
			`MERGE (s:Entity {id: $signal}) MERGE (c:Entity {id: $case}) MERGE (s)-[:LINK {type: 'SignalLinkedToCase'}]->(c)`,
			map[string]any{"signal": sid, "case": caseID})
	}
}

func getObjectLinks(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		typ := chi.URLParam(r, "objectType")
		id := chi.URLParam(r, "id")
		if typ != "Case" {
			dhttp.WriteErrorRequest(w, r, http.StatusNotImplemented, "NOT_IMPLEMENTED", "links only supported for Case")
			return
		}
		var signals []string
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			rows, err := tx.Query(r.Context(), `SELECT signal_id FROM case_signals WHERE case_id = $1`, id)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var sid string
				if err := rows.Scan(&sid); err != nil {
					return err
				}
				signals = append(signals, sid)
			}
			return rows.Err()
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		links := make([]map[string]any, 0, len(signals))
		for _, sid := range signals {
			links = append(links, map[string]any{
				"linkType": "SignalLinkedToCase",
				"from":     map[string]any{"objectType": "Signal", "primaryKey": sid},
				"to":       map[string]any{"objectType": "Case", "primaryKey": id},
			})
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{"objectType": typ, "primaryKey": id, "links": links})
	}
}

func summarizeCaseContextHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			CaseID string `json:"caseId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.CaseID == "" {
			dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "caseId required")
			return
		}
		var title string
		var signals []string
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			if err := tx.QueryRow(r.Context(),
				`SELECT title FROM cases WHERE case_id = $1`, body.CaseID).Scan(&title); err != nil {
				return err
			}
			rows, err := tx.Query(r.Context(), `SELECT signal_id FROM case_signals WHERE case_id = $1`, body.CaseID)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var sid string
				if err := rows.Scan(&sid); err != nil {
					return err
				}
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
		sigPart := "none"
		if len(signals) > 0 {
			sigPart = strings.Join(signals, ", ")
		}
		summary := fmt.Sprintf("Case %s: %s. Linked signals: %s.", body.CaseID, title, sigPart)
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{"summary": summary, "caseId": body.CaseID, "signalCount": len(signals)})
	}
}

func recordAudit(pool *pgxpool.Pool, ctx context.Context, tenant, actionType, resourceType, resourceID string, payload map[string]any) {
	b, _ := json.Marshal(payload)
	actor := auth.UserIDFromContext(ctx)
	var actorVal any
	if actor != "" {
		actorVal = actor
	}
	_ = db.ExecRLS(ctx, pool, `INSERT INTO audit_log (tenant_id, actor_id, action_type, resource_type, resource_id, payload) VALUES ($1,$2,$3,$4,$5,$6)`,
		tenant, actorVal, actionType, resourceType, resourceID, b)
}
