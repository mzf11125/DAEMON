package auth

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestAuthorizeActionRejectsPathTraversal(t *testing.T) {
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "action-types"), 0o755); err != nil {
		t.Fatal(err)
	}
	ctx := ContextWithRoles(context.Background(), []string{"analyst"})

	for _, bad := range []string{"../secret", "..", "OpenCase/../other", "OpenCase.json", "Open/Case", ""} {
		if err := AuthorizeAction(ctx, root, bad); err == nil {
			t.Fatalf("expected error for action type %q", bad)
		}
	}
}

func TestAuthorizeActionAllowsValidName(t *testing.T) {
	root := t.TempDir()
	typesDir := filepath.Join(root, "action-types")
	if err := os.Mkdir(typesDir, 0o755); err != nil {
		t.Fatal(err)
	}
	def := `{"apiName":"OpenCase","requiredRoles":[]}`
	if err := os.WriteFile(filepath.Join(typesDir, "OpenCase.json"), []byte(def), 0o644); err != nil {
		t.Fatal(err)
	}
	ctx := ContextWithRoles(context.Background(), []string{"analyst"})
	if err := AuthorizeAction(ctx, root, "OpenCase"); err != nil {
		t.Fatalf("valid action type should load: %v", err)
	}
}
