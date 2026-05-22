package main

import (
	"context"
	"encoding/json"
	"fmt"
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
	cfg := config.LoadBase(8080)
	authCfg := auth.LoadConfigFromEnv()
	ctx := context.Background()
	pool, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres")
	}
	defer pool.Close()

	r := chi.NewRouter()
	for _, mw := range dhttp.AuthenticatedStack(authCfg) {
		r.Use(mw)
	}
	r.Use(middleware.Timeout(30 * time.Second))
	dhttp.MountHealth(r, "platform-api")
	r.Route("/v1", func(r chi.Router) {
		r.Get("/me", meHandler(pool, authCfg))
		r.Get("/audit/events", listAuditEventsHandler(pool))
		r.Post("/audit/events", auditHandler(pool))
	})

	srv := &http.Server{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: r}
	go func() {
		log.Info().Int("port", cfg.HTTPPort).Msg("platform-api listening")
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

func meHandler(pool *pgxpool.Pool, authCfg auth.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sub := auth.UserIDFromContext(r.Context())
		if sub == "" && authCfg.Required {
			dhttp.WriteErrorRequest(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Bearer token required")
			return
		}
		var userID, email, name string
		var roles []string
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			if sub != "" {
				return tx.QueryRow(r.Context(),
					`SELECT user_id, email, display_name, roles FROM users WHERE user_id = $1`,
					sub).Scan(&userID, &email, &name, &roles)
			}
			tenant := dhttp.TenantFromContext(r.Context())
			return tx.QueryRow(r.Context(),
				`SELECT user_id, email, display_name, roles FROM users WHERE tenant_id = $1 LIMIT 1`, tenant).
				Scan(&userID, &email, &name, &roles)
		})
		if err != nil {
			if err == pgx.ErrNoRows {
				dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "USER_NOT_FOUND", "no user for tenant")
				return
			}
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		jwtRoles := auth.RolesFromContext(r.Context())
		if len(jwtRoles) > 0 {
			roles = jwtRoles
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"userId": userID, "tenantId": dhttp.TenantFromContext(r.Context()), "email": email, "displayName": name, "roles": roles,
		})
	}
}

func listAuditEventsHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		q := r.URL.Query()
		resourceType := q.Get("resourceType")
		resourceID := q.Get("resourceId")
		limit, offset := dhttp.ParseListPagination(r)
		var items []map[string]any
		var total int
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			countQuery := `SELECT COUNT(*) FROM audit_log WHERE tenant_id = $1`
			countArgs := []any{tenant}
			cn := 2
			if resourceType != "" {
				countQuery += fmt.Sprintf(` AND resource_type = $%d`, cn)
				countArgs = append(countArgs, resourceType)
				cn++
			}
			if resourceID != "" {
				countQuery += fmt.Sprintf(` AND resource_id = $%d`, cn)
				countArgs = append(countArgs, resourceID)
				cn++
			}
			if err := tx.QueryRow(r.Context(), countQuery, countArgs...).Scan(&total); err != nil {
				return err
			}
			query := `SELECT event_id::text, action_type, resource_type, resource_id, actor_id, created_at, payload
				FROM audit_log WHERE tenant_id = $1`
			args := []any{tenant}
			n := 2
			if resourceType != "" {
				query += fmt.Sprintf(` AND resource_type = $%d`, n)
				args = append(args, resourceType)
				n++
			}
			if resourceID != "" {
				query += fmt.Sprintf(` AND resource_id = $%d`, n)
				args = append(args, resourceID)
				n++
			}
			query += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, n, n+1)
			args = append(args, limit, offset)
			rows, err := tx.Query(r.Context(), query, args...)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var eventID, actionType, resType, resID string
				var actorID *string
				var createdAt time.Time
				var payload []byte
				if err := rows.Scan(&eventID, &actionType, &resType, &resID, &actorID, &createdAt, &payload); err != nil {
					return err
				}
				var p map[string]any
				_ = json.Unmarshal(payload, &p)
				item := map[string]any{
					"eventId": eventID, "actionType": actionType, "resourceType": resType,
					"resourceId": resID, "createdAt": createdAt.UTC().Format(time.RFC3339), "payload": p,
				}
				if actorID != nil {
					item["actorId"] = *actorID
				}
				items = append(items, item)
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
			"items": items,
			"meta":  dhttp.ListMeta(total, limit, offset, len(items)),
		})
	}
}

func auditHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			ActionType   string         `json:"actionType"`
			ResourceType string         `json:"resourceType"`
			ResourceID   string         `json:"resourceId"`
			Payload      map[string]any `json:"payload"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid JSON body")
			return
		}
		if body.ActionType == "" || body.ResourceType == "" || body.ResourceID == "" {
			dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "actionType, resourceType, and resourceId required")
			return
		}
		tenant := dhttp.TenantFromContext(r.Context())
		actor := auth.UserIDFromContext(r.Context())
		b, _ := json.Marshal(body.Payload)
		var eventID string
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(),
				`INSERT INTO audit_log (tenant_id, actor_id, action_type, resource_type, resource_id, payload)
				 VALUES ($1,$2,$3,$4,$5,$6) RETURNING event_id::text`,
				tenant, nullIfEmpty(actor), body.ActionType, body.ResourceType, body.ResourceID, b).Scan(&eventID)
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "AUDIT_FAILED", err.Error())
			return
		}
		dhttp.WriteJSON(w, http.StatusCreated, map[string]string{"eventId": eventID})
	}
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
