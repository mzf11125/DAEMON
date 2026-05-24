package testutil

import (
	"bytes"
	"context"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"testing"
)

// ServiceProcess is a built service binary with captured logs.
type ServiceProcess struct {
	Cmd *exec.Cmd
	log bytes.Buffer
	mu  sync.Mutex
}

// Logs returns stdout/stderr captured from the service process.
func (p *ServiceProcess) Logs() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.log.String()
}

// BuildAndStart runs `go build -o <tmpdir>/<name> ./cmd` then starts the binary with ServiceEnv.
func BuildAndStart(ctx context.Context, t *testing.T, serviceDir, binName string, env ...string) *ServiceProcess {
	t.Helper()
	bin := filepath.Join(t.TempDir(), binName)
	build := exec.CommandContext(ctx, "go", "build", "-o", bin, "./cmd")
	build.Dir = serviceDir
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build %s: %v\n%s", serviceDir, err, string(out))
	}
	proc := &ServiceProcess{}
	cmd := exec.CommandContext(ctx, bin)
	cmd.Dir = serviceDir
	cmd.Env = ServiceEnv(env...)
	cmd.Stdout = &proc.log
	cmd.Stderr = &proc.log
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	proc.Cmd = cmd
	return proc
}

// Alive reports whether the service process is still running.
func (p *ServiceProcess) Alive() bool {
	if p == nil || p.Cmd == nil || p.Cmd.Process == nil {
		return false
	}
	return p.Cmd.Process.Signal(syscall.Signal(0)) == nil
}
