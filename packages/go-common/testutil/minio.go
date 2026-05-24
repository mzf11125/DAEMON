package testutil

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

// MinIOEnv holds connection settings for integration tests.
type MinIOEnv struct {
	Endpoint string
	AccessKey string
	SecretKey string
	Bucket    string
	container testcontainers.Container
}

// StartMinIO runs a MinIO container and returns host:port endpoint (no scheme).
func StartMinIO(ctx context.Context, t *testing.T) *MinIOEnv {
	t.Helper()
	c, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        "minio/minio:RELEASE.2025-04-22T22-12-26Z",
			ExposedPorts: []string{"9000/tcp"},
			Cmd:          []string{"server", "/data"},
			Env: map[string]string{
				"MINIO_ROOT_USER":     "daemon",
				"MINIO_ROOT_PASSWORD": "daemonsecret",
			},
			WaitingFor: wait.ForHTTP("/minio/health/live").WithPort("9000/tcp").WithStartupTimeout(90 * time.Second),
		},
		Started: true,
	})
	if err != nil {
		t.Fatalf("minio container: %v", err)
	}
	host, err := c.Host(ctx)
	if err != nil {
		t.Fatalf("minio host: %v", err)
	}
	if host == "localhost" {
		host = "127.0.0.1"
	}
	port, err := c.MappedPort(ctx, "9000/tcp")
	if err != nil {
		t.Fatalf("minio port: %v", err)
	}
	endpoint := fmt.Sprintf("%s:%s", host, port.Port())
	bucket := "daemon-attachments"
	accessKey := "daemon"
	secretKey := "daemonsecret"
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		t.Fatalf("minio client: %v", err)
	}
	waitCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	for waitCtx.Err() == nil {
		exists, err := client.BucketExists(waitCtx, bucket)
		if err == nil {
			if !exists {
				if err := client.MakeBucket(waitCtx, bucket, minio.MakeBucketOptions{}); err != nil && !strings.Contains(err.Error(), "already") {
					t.Fatalf("minio make bucket: %v", err)
				}
			}
			break
		}
		time.Sleep(200 * time.Millisecond)
	}
	if waitCtx.Err() != nil {
		t.Fatalf("minio not ready: %v", waitCtx.Err())
	}
	return &MinIOEnv{
		Endpoint:  endpoint,
		AccessKey: accessKey,
		SecretKey: secretKey,
		Bucket:    bucket,
		container: c,
	}
}

// Cleanup terminates the MinIO container.
func (m *MinIOEnv) Cleanup(ctx context.Context) {
	if m != nil && m.container != nil {
		_ = m.container.Terminate(ctx)
	}
}
