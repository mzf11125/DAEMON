//go:build integration

package integration_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/daemon-platform/daemon/packages/go-common/auth"
)

func TestAuthorizeOpenCaseRequiresAnalystRole(t *testing.T) {
	root := ontologyRoot(t)
	ctx := auth.ContextWithRoles(context.Background(), []string{"viewer"})
	if err := auth.AuthorizeAction(ctx, root, "OpenCase"); err == nil {
		t.Fatal("expected forbidden without analyst role")
	}
	ctx2 := auth.ContextWithRoles(context.Background(), []string{"analyst"})
	if err := auth.AuthorizeAction(ctx2, root, "OpenCase"); err != nil {
		t.Fatalf("analyst should authorize OpenCase: %v", err)
	}
}

func ontologyRoot(t *testing.T) string {
	t.Helper()
	if r := os.Getenv("ONTOLOGY_ROOT"); r != "" {
		if filepath.Base(r) == "rules" {
			return filepath.Dir(r)
		}
		return r
	}
	if r := os.Getenv("REPO_ROOT"); r != "" {
		return filepath.Join(r, "ontology", "v2")
	}
	wd, _ := os.Getwd()
	return filepath.Join(wd, "..", "..", "ontology", "v2")
}
