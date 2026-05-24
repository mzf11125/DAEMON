package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/db"
	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/daemon-platform/daemon/packages/go-common/storage"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxAttachmentBytes = 25 << 20 // 25 MiB

func mountAttachmentRoutes(r chi.Router, pool *pgxpool.Pool, store *storage.ObjectStore) {
	r.Post("/attachments", uploadAttachment(pool, store))
	r.Get("/attachments", listAttachments(pool))
	r.Get("/attachments/{id}", getAttachment(pool))
	r.Get("/attachments/{id}/content", getAttachmentContent(pool, store))
	r.Post("/attachments/{id}/links", linkAttachment(pool))
}

func uploadAttachment(pool *pgxpool.Pool, store *storage.ObjectStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if store == nil || !store.Available() {
			dhttp.WriteErrorRequest(w, r, http.StatusServiceUnavailable, "STORAGE_UNAVAILABLE", "object storage not configured")
			return
		}
		if err := r.ParseMultipartForm(maxAttachmentBytes); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_MULTIPART", err.Error())
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "MISSING_FILE", "multipart field 'file' required")
			return
		}
		defer file.Close()
		if header.Size > maxAttachmentBytes {
			dhttp.WriteErrorRequest(w, r, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE", "max 25 MiB")
			return
		}
		contentType := header.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		tenant := dhttp.TenantFromContext(r.Context())
		attachmentID := storage.NewAttachmentID()
		objectKey := storage.ObjectKey(tenant, attachmentID, header.Filename)
		written, err := store.Put(r.Context(), objectKey, contentType, file, header.Size)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPLOAD_FAILED", err.Error())
			return
		}
		actor := auth.UserIDFromContext(r.Context())
		err = db.ExecRLS(r.Context(), pool,
			`INSERT INTO attachments (attachment_id, tenant_id, object_key, filename, content_type, size_bytes, created_by)
			 VALUES ($1::uuid,$2,$3,$4,$5,$6,$7)`,
			attachmentID, tenant, objectKey, header.Filename, contentType, written, nullIfEmpty(actor))
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DB_FAILED", err.Error())
			return
		}
		resourceType := r.FormValue("resourceType")
		resourceID := r.FormValue("resourceId")
		role := r.FormValue("role")
		if role == "" {
			role = "attachment"
		}
		if resourceType != "" && resourceID != "" {
			_ = db.ExecRLS(r.Context(), pool,
				`INSERT INTO attachment_links (tenant_id, attachment_id, resource_type, resource_id, role)
				 VALUES ($1,$2::uuid,$3,$4,$5) ON CONFLICT DO NOTHING`,
				tenant, attachmentID, resourceType, resourceID, role)
		}
		dhttp.WriteJSON(w, http.StatusCreated, map[string]any{
			"attachmentId": attachmentID,
			"filename":     header.Filename,
			"contentType":  contentType,
			"sizeBytes":    written,
			"objectKey":    objectKey,
		})
	}
}

func listAttachments(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		resourceType := r.URL.Query().Get("resourceType")
		resourceID := r.URL.Query().Get("resourceId")
		role := r.URL.Query().Get("role")
		limit, offset := dhttp.ParseListPagination(r)
		var items []map[string]any
		var total int
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			base := `FROM attachments a`
			args := []any{tenant}
			where := ` WHERE a.tenant_id = $1`
			n := 2
			if resourceType != "" && resourceID != "" {
				base += ` JOIN attachment_links l ON l.attachment_id = a.attachment_id AND l.tenant_id = a.tenant_id`
				where += fmt.Sprintf(` AND l.resource_type = $%d AND l.resource_id = $%d`, n, n+1)
				args = append(args, resourceType, resourceID)
				n += 2
				if role != "" {
					where += fmt.Sprintf(` AND l.role = $%d`, n)
					args = append(args, role)
					n++
				}
			}
			if err := tx.QueryRow(r.Context(), `SELECT COUNT(*) `+base+where, args...).Scan(&total); err != nil {
				return err
			}
			q := `SELECT a.attachment_id::text, a.filename, a.content_type, a.size_bytes, a.created_at, a.created_by ` +
				base + where + fmt.Sprintf(` ORDER BY a.created_at DESC LIMIT $%d OFFSET $%d`, n, n+1)
			args = append(args, limit, offset)
			rows, err := tx.Query(r.Context(), q, args...)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var id, filename, ct string
				var size int64
				var createdAt any
				var createdBy *string
				if err := rows.Scan(&id, &filename, &ct, &size, &createdAt, &createdBy); err != nil {
					return err
				}
				item := map[string]any{
					"attachmentId": id, "filename": filename, "contentType": ct, "sizeBytes": size, "createdAt": createdAt,
				}
				if createdBy != nil {
					item["createdBy"] = *createdBy
				}
				items = append(items, item)
			}
			return rows.Err()
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		if items == nil {
			items = []map[string]any{}
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"items": items,
			"meta":  dhttp.ListMeta(total, limit, offset, len(items)),
		})
	}
}

func getAttachment(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		tenant := dhttp.TenantFromContext(r.Context())
		var filename, ct, objectKey string
		var size int64
		var createdAt any
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(),
				`SELECT filename, content_type, size_bytes, object_key, created_at FROM attachments
				 WHERE tenant_id = $1 AND attachment_id = $2::uuid`, tenant, id).
				Scan(&filename, &ct, &size, &objectKey, &createdAt)
		})
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "attachment not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		var links []map[string]any
		_ = db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			rows, err := tx.Query(r.Context(),
				`SELECT link_id::text, resource_type, resource_id, role FROM attachment_links
				 WHERE tenant_id = $1 AND attachment_id = $2::uuid`, tenant, id)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var linkID, resType, resID, role string
				if err := rows.Scan(&linkID, &resType, &resID, &role); err != nil {
					return err
				}
				links = append(links, map[string]any{
					"linkId": linkID, "resourceType": resType, "resourceId": resID, "role": role,
				})
			}
			return rows.Err()
		})
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"attachmentId": id, "filename": filename, "contentType": ct, "sizeBytes": size,
			"objectKey": objectKey, "createdAt": createdAt, "links": links,
		})
	}
}

func getAttachmentContent(pool *pgxpool.Pool, store *storage.ObjectStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if store == nil || !store.Available() {
			dhttp.WriteErrorRequest(w, r, http.StatusServiceUnavailable, "STORAGE_UNAVAILABLE", "object storage not configured")
			return
		}
		id := chi.URLParam(r, "id")
		tenant := dhttp.TenantFromContext(r.Context())
		var objectKey, filename, ct string
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(),
				`SELECT object_key, filename, content_type FROM attachments WHERE tenant_id = $1 AND attachment_id = $2::uuid`,
				tenant, id).Scan(&objectKey, &filename, &ct)
		})
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "attachment not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		rc, err := store.Get(r.Context(), objectKey)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DOWNLOAD_FAILED", err.Error())
			return
		}
		defer rc.Close()
		w.Header().Set("Content-Type", ct)
		w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, strings.ReplaceAll(filename, `"`, "")))
		_, _ = io.Copy(w, rc)
	}
}

func linkAttachment(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var body struct {
			ResourceType string `json:"resourceType"`
			ResourceID   string `json:"resourceId"`
			Role         string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid JSON body")
			return
		}
		if body.ResourceType == "" || body.ResourceID == "" {
			dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_PARAM", "resourceType and resourceId required")
			return
		}
		if body.Role == "" {
			body.Role = "attachment"
		}
		tenant := dhttp.TenantFromContext(r.Context())
		var exists bool
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(),
				`SELECT EXISTS(SELECT 1 FROM attachments WHERE tenant_id = $1 AND attachment_id = $2::uuid)`,
				tenant, id).Scan(&exists)
		})
		if err != nil || !exists {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "attachment not found")
			return
		}
		var linkID string
		err = db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(),
				`INSERT INTO attachment_links (tenant_id, attachment_id, resource_type, resource_id, role)
				 VALUES ($1,$2::uuid,$3,$4,$5)
				 ON CONFLICT (tenant_id, attachment_id, resource_type, resource_id, role)
				 DO UPDATE SET created_at = attachment_links.created_at
				 RETURNING link_id::text`,
				tenant, id, body.ResourceType, body.ResourceID, body.Role).Scan(&linkID)
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "LINK_FAILED", err.Error())
			return
		}
		dhttp.WriteJSON(w, http.StatusCreated, map[string]any{
			"linkId": linkID, "attachmentId": id,
			"resourceType": body.ResourceType, "resourceId": body.ResourceID, "role": body.Role,
		})
	}
}

func tenantFeatures(ctx context.Context, pool *pgxpool.Pool, tenant string) map[string]any {
	var raw []byte
	err := db.WithRLSTx(ctx, pool, func(tx pgx.Tx) error {
		return tx.QueryRow(ctx,
			`SELECT COALESCE(features, '{}'::jsonb) FROM tenant_settings WHERE tenant_id = $1`, tenant).
			Scan(&raw)
	})
	if err != nil {
		return map[string]any{}
	}
	var features map[string]any
	_ = json.Unmarshal(raw, &features)
	if features == nil {
		features = map[string]any{}
	}
	return features
}

func parseBoolFeature(features map[string]any, key string) bool {
	v, ok := features[key]
	if !ok {
		return false
	}
	switch t := v.(type) {
	case bool:
		return t
	case string:
		b, _ := strconv.ParseBool(t)
		return b
	default:
		return false
	}
}
