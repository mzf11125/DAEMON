package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/ctxkeys"
	"github.com/golang-jwt/jwt/v5"
)

func TestValidateTokenWithTestKey(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	cfg := Config{
		Issuer:        "http://localhost:8180/realms/daemon-demo",
		Audience:      "console-web",
		TestPublicKey: &key.PublicKey,
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"sub":       "user-analyst-1",
		"iss":       cfg.Issuer,
		"aud":       cfg.Audience,
		"tenant_id": "tenant-demo",
		"roles":     []string{"analyst"},
		"exp":       time.Now().Add(time.Hour).Unix(),
	})
	signed, err := tok.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := validateToken(context.Background(), cfg, signed)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != "user-analyst-1" || claims.TenantID != "tenant-demo" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
	ctx := context.WithValue(context.Background(), rolesKey, claims.Roles)
	if !HasRole(ctx, "analyst") {
		t.Fatal("expected analyst role")
	}
}

func TestValidateTokenHS256Supabase(t *testing.T) {
	secret := "super-secret-jwt-for-tests-only-32bytes!"
	cfg := Config{
		Issuer:    "http://127.0.0.1:54331/auth/v1",
		Audience:  "authenticated",
		JWTSecret: secret,
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":       "550e8400-e29b-41d4-a716-446655440000",
		"aud":       "authenticated",
		"tenant_id": "tenant-demo",
		"roles":     []string{"analyst"},
		"exp":       time.Now().Add(time.Hour).Unix(),
	})
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	claims, err := validateToken(context.Background(), cfg, signed)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != "550e8400-e29b-41d4-a716-446655440000" || claims.TenantID != "tenant-demo" {
		t.Fatalf("unexpected: %+v", claims)
	}
}

func TestHasRoleFromContext(t *testing.T) {
	ctx := context.WithValue(context.Background(), rolesKey, []string{"analyst"})
	if !HasRole(ctx, "analyst") {
		t.Fatal("expected role")
	}
	ctx2 := context.WithValue(context.Background(), ctxkeys.TenantID, "tenant-demo")
	_ = ctx2
}
