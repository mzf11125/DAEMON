package http

import (
	"context"
	"net/http"

	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/ctxkeys"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
)

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = uuid.NewString()
		}
		ctx := context.WithValue(r.Context(), ctxkeys.RequestID, id)
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func Tenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := r.Context().Value(ctxkeys.TenantID).(string); ok {
			next.ServeHTTP(w, r)
			return
		}
		tenant := r.Header.Get("X-Tenant-Id")
		if tenant == "" {
			tenant = "tenant-demo"
		}
		ctx := context.WithValue(r.Context(), ctxkeys.TenantID, tenant)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RateLimitHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-RateLimit-Limit", "10000")
		w.Header().Set("X-RateLimit-Remaining", "9999")
		next.ServeHTTP(w, r)
	})
}

func StandardStack() []func(http.Handler) http.Handler {
	return []func(http.Handler) http.Handler{
		middleware.Recoverer,
		middleware.RealIP,
		RequestID,
		RateLimitHeaders,
		Tenant,
	}
}

// AuthenticatedStack applies OIDC when configured, then tenant header fallback.
func AuthenticatedStack(oidcCfg auth.Config) []func(http.Handler) http.Handler {
	return []func(http.Handler) http.Handler{
		middleware.Recoverer,
		middleware.RealIP,
		RequestID,
		RateLimitHeaders,
		auth.Middleware(oidcCfg),
		Tenant,
	}
}

func TenantFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxkeys.TenantID).(string); ok && v != "" {
		return v
	}
	return "tenant-demo"
}

func RequestIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxkeys.RequestID).(string); ok {
		return v
	}
	return ""
}
