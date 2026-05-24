//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/testutil"
)

func startPlatformAPI(ctx context.Context, t *testing.T, env *testutil.Env, minio *testutil.MinIOEnv) (base string, proc *testutil.ServiceProcess) {
	t.Helper()
	port := testutil.FreeTCPPort(t)
	svcDir := filepath.Join(env.RepoRoot, "services", "platform-api")
	envVars := []string{
		"DATABASE_URL=" + env.PostgresURL,
		"HTTP_PORT=" + port,
		"OIDC_REQUIRED=false",
	}
	if minio != nil {
		envVars = append(envVars,
			"MINIO_ENDPOINT="+minio.Endpoint,
			"MINIO_ACCESS_KEY="+minio.AccessKey,
			"MINIO_SECRET_KEY="+minio.SecretKey,
			"MINIO_BUCKET="+minio.Bucket,
		)
	}
	proc = testutil.BuildAndStart(ctx, t, svcDir, "platform-api", envVars...)
	base = "http://localhost:" + port
	waitServiceHealth(t, base+"/health", "platform-api", proc, 90*time.Second)
	return base, proc
}

func TestGeoMapHTTP(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)
	if err := testutil.RunSeed(ctx, env); err != nil {
		t.Fatal(err)
	}

	base, proc := startPlatformAPI(ctx, t, env, nil)
	defer stopService(proc)

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/v1/geo/map", nil)
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("geo map: %d %s", resp.StatusCode, string(b))
	}
	var envelope struct {
		Data struct {
			Sites  []map[string]any `json:"sites"`
			Assets []map[string]any `json:"assets"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		t.Fatal(err)
	}
	if len(envelope.Data.Sites) < 1 {
		t.Fatalf("expected at least one site pin, got %d", len(envelope.Data.Sites))
	}
}

func TestGeoMapDisabledWithoutFeature(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)

	base, proc := startPlatformAPI(ctx, t, env, nil)
	defer stopService(proc)

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/v1/geo/map", nil)
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected 403 without seed/features, got %d %s", resp.StatusCode, string(b))
	}
}

func TestAttachmentsHTTP(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)

	minio := testutil.StartMinIO(ctx, t)
	defer minio.Cleanup(ctx)

	base, proc := startPlatformAPI(ctx, t, env, minio)
	defer stopService(proc)

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	fw, err := w.CreateFormFile("file", "thumb.png")
	if err != nil {
		t.Fatal(err)
	}
	png := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}
	if _, err := fw.Write(png); err != nil {
		t.Fatal(err)
	}
	_ = w.WriteField("resourceType", "Case")
	_ = w.WriteField("resourceId", "case-demo-001")
	_ = w.WriteField("role", "thumbnail")
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/attachments", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("upload: %d %s", resp.StatusCode, string(b))
	}

	listURL := fmt.Sprintf("%s/v1/attachments?resourceType=Case&resourceId=case-demo-001&role=thumbnail", base)
	listReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, listURL, nil)
	listReq.Header.Set("X-Tenant-Id", "tenant-demo")
	listResp, err := http.DefaultClient.Do(listReq)
	if err != nil {
		t.Fatal(err)
	}
	defer listResp.Body.Close()
	if listResp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(listResp.Body)
		t.Fatalf("list: %d %s", listResp.StatusCode, string(b))
	}
	var listEnvelope struct {
		Data struct {
			Items []map[string]any `json:"items"`
		} `json:"data"`
	}
	if err := json.NewDecoder(listResp.Body).Decode(&listEnvelope); err != nil {
		t.Fatal(err)
	}
	if len(listEnvelope.Data.Items) < 1 {
		t.Fatal("expected thumbnail attachment link")
	}
	if fn, _ := listEnvelope.Data.Items[0]["filename"].(string); fn != "thumb.png" {
		t.Fatalf("unexpected filename: %+v", listEnvelope.Data.Items[0])
	}
}
