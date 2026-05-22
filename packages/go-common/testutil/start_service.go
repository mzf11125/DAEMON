package testutil

import (
	"context"
	"os/exec"
	"path/filepath"
	"testing"
)

// BuildAndStart runs `go build -o <tmpdir>/<name> ./cmd` then starts the binary with ServiceEnv.
func BuildAndStart(ctx context.Context, t *testing.T, serviceDir, binName string, env ...string) *exec.Cmd {
	t.Helper()
	bin := filepath.Join(t.TempDir(), binName)
	build := exec.CommandContext(ctx, "go", "build", "-o", bin, "./cmd")
	build.Dir = serviceDir
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build %s: %v\n%s", serviceDir, err, string(out))
	}
	cmd := exec.CommandContext(ctx, bin)
	cmd.Dir = serviceDir
	cmd.Env = ServiceEnv(env...)
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	return cmd
}
