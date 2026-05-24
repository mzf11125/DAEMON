package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// ObjectStore uploads and downloads tenant-scoped blobs.
type ObjectStore struct {
	client *minio.Client
	bucket string
}

// Config from environment (MINIO_*).
type Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

// LoadConfigFromEnv reads MinIO settings; returns zero Config if MINIO_ENDPOINT unset.
func LoadConfigFromEnv() Config {
	useSSL := strings.EqualFold(os.Getenv("MINIO_USE_SSL"), "true")
	return Config{
		Endpoint:  os.Getenv("MINIO_ENDPOINT"),
		AccessKey: getenv("MINIO_ACCESS_KEY", "daemon"),
		SecretKey: getenv("MINIO_SECRET_KEY", "daemonsecret"),
		Bucket:    getenv("MINIO_BUCKET", "daemon-attachments"),
		UseSSL:    useSSL,
	}
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

// NewObjectStore connects and ensures bucket exists. Returns nil client if endpoint empty.
func NewObjectStore(ctx context.Context, cfg Config) (*ObjectStore, error) {
	if cfg.Endpoint == "" {
		return nil, nil
	}
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}
	store := &ObjectStore{client: client, bucket: cfg.Bucket}
	exists, err := client.BucketExists(ctx, cfg.Bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		if err := client.MakeBucket(ctx, cfg.Bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, err
		}
	}
	return store, nil
}

// Available reports whether blob storage is configured.
func (s *ObjectStore) Available() bool {
	return s != nil && s.client != nil
}

// ObjectKey builds a tenant-scoped storage key.
func ObjectKey(tenantID, attachmentID, filename string) string {
	safe := strings.ReplaceAll(filename, "/", "_")
	return fmt.Sprintf("%s/%s/%s", tenantID, attachmentID, safe)
}

// Put uploads content and returns bytes written.
func (s *ObjectStore) Put(ctx context.Context, objectKey, contentType string, r io.Reader, size int64) (int64, error) {
	info, err := s.client.PutObject(ctx, s.bucket, objectKey, r, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return 0, err
	}
	return info.Size, nil
}

// Get opens a reader for download; caller must close.
func (s *ObjectStore) Get(ctx context.Context, objectKey string) (io.ReadCloser, error) {
	return s.client.GetObject(ctx, s.bucket, objectKey, minio.GetObjectOptions{})
}

// NewAttachmentID returns a UUID string for attachment rows.
func NewAttachmentID() string {
	return uuid.New().String()
}
