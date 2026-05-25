package archiver

import (
	"bytes"
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Writer uploads immutable archive objects. Not invoked when dry-run is set at runner level.
type S3Writer struct {
	client *s3.Client
}

func NewS3Writer(ctx context.Context, region string) (*S3Writer, error) {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("aws config: %w", err)
	}
	return &S3Writer{client: s3.NewFromConfig(cfg)}, nil
}

func (w *S3Writer) WriteBatch(ctx context.Context, batch ArchiveBatch, payloadJSONL []byte) (string, int64, error) {
	out, err := w.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(batch.Bucket),
		Key:         aws.String(batch.Key),
		Body:        bytes.NewReader(payloadJSONL),
		ContentType: aws.String("application/x-ndjson"),
	})
	if err != nil {
		return "", 0, fmt.Errorf("s3 put object: %w", err)
	}
	etag := ""
	if out.ETag != nil {
		etag = *out.ETag
	}
	return etag, int64(len(payloadJSONL)), nil
}

// LogWriter is used in dry-run mode: logs intent without network I/O.
type LogWriter struct{}

func (LogWriter) WriteBatch(ctx context.Context, batch ArchiveBatch, payloadJSONL []byte) (string, int64, error) {
	log.Printf("audit-archival dry-run: would upload bucket=%s key=%s bytes=%d tenant=%s class=%s rows=%d",
		batch.Bucket, batch.Key, len(payloadJSONL), batch.TenantID, batch.EventClass, batch.RowCount)
	return "dry-run-etag", int64(len(payloadJSONL)), nil
}
