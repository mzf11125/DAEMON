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
	"github.com/daemon-platform/daemon/services/ontology-builder/internal/handler"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	cfg := config.LoadBase(8085)
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
	dhttp.MountHealth(r, "ontology-builder")

	// Initialize handlers
	wsHandler := handler.NewWorkspaceHandler(pool)
	objHandler := handler.NewObjectHandler(pool)
	linkHandler := handler.NewLinkHandler(pool)
	actionHandler := handler.NewActionHandler(pool)

	r.Route("/v1", func(r chi.Router) {
		// Workspace CRUD
		r.Get("/workspaces", wsHandler.List)
		r.Post("/workspaces", wsHandler.Create)
		r.Route("/workspaces/{workspaceId}", func(r chi.Router) {
			r.Get("/", wsHandler.Get)
			r.Put("/", wsHandler.Update)
			r.Delete("/", wsHandler.Delete)
			r.Post("/clone", wsHandler.Clone)

			// Object types
			r.Get("/objects", objHandler.List)
			r.Post("/objects", objHandler.Create)
			r.Route("/objects/{objectTypeId}", func(r chi.Router) {
				r.Get("/", objHandler.Get)
				r.Put("/", objHandler.Update)
				r.Delete("/", objHandler.Delete)
				r.Post("/properties", objHandler.AddProperty)
				r.Put("/properties/{propId}", objHandler.UpdateProperty)
				r.Delete("/properties/{propId}", objHandler.DeleteProperty)
			})
			r.Post("/objects/reorder", objHandler.Reorder)

			// Link types
			r.Get("/links", linkHandler.List)
			r.Post("/links", linkHandler.Create)
			r.Route("/links/{linkId}", func(r chi.Router) {
				r.Get("/", linkHandler.Get)
				r.Put("/", linkHandler.Update)
				r.Delete("/", linkHandler.Delete)
			})

			// Action types
			r.Get("/actions", actionHandler.List)
			r.Post("/actions", actionHandler.Create)
			r.Route("/actions/{actionId}", func(r chi.Router) {
				r.Get("/", actionHandler.Get)
				r.Put("/", actionHandler.Update)
				r.Delete("/", actionHandler.Delete)
				r.Post("/params", actionHandler.AddParam)
				r.Put("/params/{paramId}", actionHandler.UpdateParam)
				r.Delete("/params/{paramId}", actionHandler.DeleteParam)
			})

			// Validation & Compile
			r.Post("/validate", handler.ValidateWorkspace(pool))
			r.Post("/compile/preview", handler.CompilePreview(pool))
			r.Post("/compile", handler.CompileWorkspace(pool))

			// Versions
			r.Get("/versions", handler.ListVersions(pool))
			r.Get("/versions/{version}/diff", handler.VersionDiff(pool))
			r.Post("/versions/{version}/rollback", handler.RollbackVersion(pool))
		})
	})

	// Templates (global, outside workspace scope)
	r.Get("/v1/templates", handler.ListTemplates(pool))
	r.Get("/v1/templates/{templateId}", handler.GetTemplate(pool))
	r.Post("/v1/templates", handler.CreateTemplate(pool))

	// Publish workspace
	r.Post("/v1/workspaces/{workspaceId}/publish", handler.PublishWorkspace(pool))

	srv := &http.Server{Addr: ":" + strconv.Itoa(cfg.HTTPPort), Handler: r}
	go func() {
		log.Info().Int("port", cfg.HTTPPort).Msg("ontology-builder listening")
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

// unused but needed to satisfy import
var _ pgxpool.Pool
