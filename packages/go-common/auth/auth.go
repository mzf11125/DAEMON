package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/ctxkeys"
	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const (
	userIDKey ctxKey = "userId"
	rolesKey  ctxKey = "roles"
	claimsKey ctxKey = "jwtClaims"
)

// Config for OIDC JWT validation.
type Config struct {
	Required      bool
	Issuer        string
	Audience      string
	JWTSecret     string // SUPABASE_JWT_SECRET for local HS256
	TestPublicKey *rsa.PublicKey
}

func LoadConfigFromEnv() Config {
	required := strings.EqualFold(os.Getenv("OIDC_REQUIRED"), "true")
	return Config{
		Required:  required,
		Issuer:    strings.TrimSuffix(os.Getenv("OIDC_ISSUER"), "/"),
		Audience:  os.Getenv("OIDC_AUDIENCE"),
		JWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
	}
}

// IsSupabaseMode reports whether issuer points at Supabase Auth (/auth/v1).
func IsSupabaseMode(cfg Config) bool {
	return strings.Contains(cfg.Issuer, "/auth/v1") || cfg.JWTSecret != ""
}

type jwksCache struct {
	mu   sync.RWMutex
	keys map[string]*rsa.PublicKey
	at   time.Time
	ttl  time.Duration
}

func (c *jwksCache) get(issuer string, testKey *rsa.PublicKey) (map[string]*rsa.PublicKey, error) {
	if testKey != nil {
		return map[string]*rsa.PublicKey{"test": testKey}, nil
	}
	c.mu.RLock()
	if time.Since(c.at) < c.ttl && len(c.keys) > 0 {
		keys := c.keys
		c.mu.RUnlock()
		return keys, nil
	}
	c.mu.RUnlock()

	keys, err := fetchJWKS(issuer)
	if err != nil {
		return nil, err
	}
	c.mu.Lock()
	c.keys = keys
	c.at = time.Now()
	c.ttl = 10 * time.Minute
	c.mu.Unlock()
	return keys, nil
}

func fetchJWKS(issuer string) (map[string]*rsa.PublicKey, error) {
	wellKnown := issuer + "/.well-known/openid-configuration"
	resp, err := http.Get(wellKnown) //nolint:noctx
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var meta struct {
		JWKSURI string `json:"jwks_uri"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&meta); err != nil {
		return nil, err
	}
	if meta.JWKSURI == "" {
		return nil, fmt.Errorf("missing jwks_uri")
	}
	resp2, err := http.Get(meta.JWKSURI) //nolint:noctx
	if err != nil {
		return nil, err
	}
	defer resp2.Body.Close()
	var jwks struct {
		Keys []json.RawMessage `json:"keys"`
	}
	if err := json.NewDecoder(resp2.Body).Decode(&jwks); err != nil {
		return nil, err
	}
	out := make(map[string]*rsa.PublicKey)
	for _, raw := range jwks.Keys {
		var hdr struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		}
		if err := json.Unmarshal(raw, &hdr); err != nil || hdr.Kty != "RSA" {
			continue
		}
		pub, err := rsaPublicKeyFromJWK(hdr.N, hdr.E)
		if err != nil {
			continue
		}
		kid := hdr.Kid
		if kid == "" {
			kid = "default"
		}
		out[kid] = pub
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no RSA keys in JWKS")
	}
	return out, nil
}

// Middleware validates Bearer JWT when OIDC is required; otherwise falls back to X-Tenant-Id.
func Middleware(cfg Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authz := r.Header.Get("Authorization")
			if strings.HasPrefix(authz, "Bearer ") {
				tokenStr := strings.TrimPrefix(authz, "Bearer ")
				claims, err := validateToken(r.Context(), cfg, tokenStr)
				if err != nil {
					writeUnauthorized(w, err.Error())
					return
				}
				ctx := r.Context()
				ctx = context.WithValue(ctx, claimsKey, claims)
				ctx = context.WithValue(ctx, userIDKey, claims.Subject)
				ctx = context.WithValue(ctx, ctxkeys.TenantID, claims.TenantID)
				if len(claims.Roles) > 0 {
					ctx = context.WithValue(ctx, rolesKey, claims.Roles)
				}
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			if cfg.Required {
				writeUnauthorized(w, "Bearer token required")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Claims extracted from JWT.
type Claims struct {
	Subject  string
	TenantID string
	Roles    []string
}

// JSONForRLS returns claims JSON for SET LOCAL request.jwt.claims.
func (c *Claims) JSONForRLS() string {
	m := map[string]any{
		"sub":       c.Subject,
		"role":      "authenticated",
		"tenant_id": c.TenantID,
		"aud":       "authenticated",
	}
	if len(c.Roles) > 0 {
		m["roles"] = c.Roles
	}
	b, _ := json.Marshal(m)
	return string(b)
}

// ClaimsFromContext returns validated JWT claims when present.
func ClaimsFromContext(ctx context.Context) (*Claims, bool) {
	c, ok := ctx.Value(claimsKey).(*Claims)
	return c, ok && c != nil
}

func validateToken(ctx context.Context, cfg Config, tokenStr string) (*Claims, error) {
	_ = ctx
	var lastErr error
	if cfg.JWTSecret != "" {
		if claims, err := validateHS256(cfg, tokenStr); err == nil {
			return claims, nil
		} else {
			lastErr = err
		}
	}
	if claims, err := validateRS256(cfg, tokenStr); err == nil {
		return claims, nil
	} else if err != nil {
		lastErr = err
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("token validation failed")
}

func validateHS256(cfg Config, tokenStr string) (*Claims, error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected alg %s", t.Method.Alg())
		}
		return []byte(cfg.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	mc, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	if cfg.Audience != "" && !claimAudienceOK(mc, cfg.Audience) {
		return nil, fmt.Errorf("audience mismatch")
	}
	return mapClaimsToClaims(mc)
}

func validateRS256(cfg Config, tokenStr string) (*Claims, error) {
	keys, err := (&jwksCache{}).get(cfg.Issuer, cfg.TestPublicKey)
	if err != nil {
		return nil, err
	}
	var lastErr error
	for _, pub := range keys {
		tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
			if t.Method.Alg() != jwt.SigningMethodRS256.Alg() {
				return nil, fmt.Errorf("unexpected alg %s", t.Method.Alg())
			}
			return pub, nil
		}, jwt.WithIssuer(cfg.Issuer), jwt.WithValidMethods([]string{"RS256"}))
		if err != nil {
			lastErr = err
			continue
		}
		if !tok.Valid {
			lastErr = fmt.Errorf("invalid token")
			continue
		}
		mc, ok := tok.Claims.(jwt.MapClaims)
		if !ok {
			lastErr = fmt.Errorf("invalid claims")
			continue
		}
		if cfg.Audience != "" && !claimAudienceOK(mc, cfg.Audience) {
			lastErr = fmt.Errorf("audience mismatch")
			continue
		}
		claims, err := mapClaimsToClaims(mc)
		if err != nil {
			lastErr = err
			continue
		}
		return claims, nil
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("token validation failed")
}

func mapClaimsToClaims(mc jwt.MapClaims) (*Claims, error) {
	sub, _ := mc["sub"].(string)
	tenant, _ := mc["tenant_id"].(string)
	if tenant == "" {
		tenant, _ = mc["tenantId"].(string)
	}
	if tenant == "" {
		if meta, ok := mc["app_metadata"].(map[string]any); ok {
			if t, ok := meta["tenant_id"].(string); ok {
				tenant = t
			}
		}
	}
	if tenant == "" {
		return nil, fmt.Errorf("missing tenant_id claim")
	}
	roles := parseRolesClaim(mc["roles"])
	if len(roles) == 0 {
		if meta, ok := mc["app_metadata"].(map[string]any); ok {
			roles = parseRolesClaim(meta["roles"])
		}
	}
	if len(roles) == 0 {
		if r, ok := mc["role"].(string); ok && r != "" {
			roles = []string{r}
		}
	}
	return &Claims{Subject: sub, TenantID: tenant, Roles: roles}, nil
}

func parseRolesClaim(v any) []string {
	var roles []string
	switch x := v.(type) {
	case []any:
		for _, r := range x {
			if s, ok := r.(string); ok {
				roles = append(roles, s)
			}
		}
	case []string:
		roles = append(roles, x...)
	case string:
		for _, p := range strings.Split(x, ",") {
			if s := strings.TrimSpace(p); s != "" {
				roles = append(roles, s)
			}
		}
	}
	return roles
}

func claimAudienceOK(mc jwt.MapClaims, aud string) bool {
	switch v := mc["aud"].(type) {
	case string:
		return v == aud
	case []any:
		for _, a := range v {
			if s, ok := a.(string); ok && s == aud {
				return true
			}
		}
	}
	return false
}

// UserIDFromContext returns JWT sub when present.
func UserIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(userIDKey).(string); ok {
		return v
	}
	return ""
}

// RolesFromContext returns roles from JWT.
func RolesFromContext(ctx context.Context) []string {
	if v, ok := ctx.Value(rolesKey).([]string); ok {
		return v
	}
	return nil
}

// ContextWithRoles attaches roles for tests and internal callers.
func ContextWithRoles(ctx context.Context, roles []string) context.Context {
	return context.WithValue(ctx, rolesKey, roles)
}

// ContextWithClaims attaches full claims for tests (RLS integration).
func ContextWithClaims(ctx context.Context, c *Claims) context.Context {
	ctx = context.WithValue(ctx, claimsKey, c)
	ctx = context.WithValue(ctx, userIDKey, c.Subject)
	ctx = context.WithValue(ctx, ctxkeys.TenantID, c.TenantID)
	if len(c.Roles) > 0 {
		ctx = context.WithValue(ctx, rolesKey, c.Roles)
	}
	return ctx
}

// ValidateBearerToken validates a JWT string (tests).
func ValidateBearerToken(cfg Config, tokenStr string) (*Claims, error) {
	return validateToken(context.Background(), cfg, tokenStr)
}

func rsaPublicKeyFromJWK(nB64, eB64 string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nB64)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eB64)
	if err != nil {
		return nil, err
	}
	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}
	if e == 0 {
		return nil, fmt.Errorf("invalid exponent")
	}
	return &rsa.PublicKey{N: n, E: e}, nil
}

func writeUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{"code": "UNAUTHORIZED", "message": message},
	})
}

// HasRole checks membership.
func HasRole(ctx context.Context, role string) bool {
	for _, r := range RolesFromContext(ctx) {
		if r == role {
			return true
		}
	}
	return false
}
