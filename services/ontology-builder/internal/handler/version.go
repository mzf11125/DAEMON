package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VersionEntry struct {
	ID            string          `json:"id"`
	WorkspaceID   string          `json:"workspaceId"`
	Version       int             `json:"version"`
	Snapshot      json.RawMessage `json:"snapshot"`
	ChangeSummary string          `json:"changeSummary,omitempty"`
	Published     bool            `json:"published"`
	PublishedAt   *time.Time      `json:"publishedAt,omitempty"`
	CreatedBy     string          `json:"createdBy,omitempty"`
	CreatedAt     time.Time       `json:"createdAt"`
}

// ListVersions returns version history for a workspace.
func ListVersions(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID := chi.URLParam(r, "workspaceId")
		rows, err := pool.Query(r.Context(),
			`SELECT id, workspace_id, version, snapshot, change_summary, published, published_at, created_by, created_at
			 FROM ontology_versions WHERE workspace_id = $1 ORDER BY version DESC`, workspaceID,
		)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		defer rows.Close()

		var versions []VersionEntry
		for rows.Next() {
			var v VersionEntry
			if err := rows.Scan(&v.ID, &v.WorkspaceID, &v.Version, &v.Snapshot,
				&v.ChangeSummary, &v.Published, &v.PublishedAt, &v.CreatedBy, &v.CreatedAt); err != nil {
				continue
			}
			versions = append(versions, v)
		}
		if versions == nil {
			versions = []VersionEntry{}
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{"versions": versions})
	}
}

// VersionDiff returns the diff between two versions.
func VersionDiff(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID := chi.URLParam(r, "workspaceId")
		versionStr := chi.URLParam(r, "version")
		version, _ := strconv.Atoi(versionStr)

		var currentSnapshot []byte
		err := pool.QueryRow(r.Context(),
			`SELECT snapshot FROM ontology_versions WHERE workspace_id = $1 AND version = $2`,
			workspaceID, version,
		).Scan(&currentSnapshot)
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "version not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}

		// Compare with previous version
		var prevSnapshot []byte
		_ = pool.QueryRow(r.Context(),
			`SELECT snapshot FROM ontology_versions WHERE workspace_id = $1 AND version = $2`,
			workspaceID, version-1,
		).Scan(&prevSnapshot)

		var current, previous map[string]any
		json.Unmarshal(currentSnapshot, &current)
		json.Unmarshal(prevSnapshot, &previous)

		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"version":  version,
			"current":  current,
			"previous": previous,
		})
	}
}

// RollbackVersion restores a workspace to a previous version snapshot.
func RollbackVersion(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID := chi.URLParam(r, "workspaceId")
		versionStr := chi.URLParam(r, "version")
		version, _ := strconv.Atoi(versionStr)

		var snapshot []byte
		err := pool.QueryRow(r.Context(),
			`SELECT snapshot FROM ontology_versions WHERE workspace_id = $1 AND version = $2`,
			workspaceID, version,
		).Scan(&snapshot)
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "version not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}

		// Phase 1: record the rollback as a new version pointing to the old snapshot
		var maxVersion int
		pool.QueryRow(r.Context(),
			`SELECT COALESCE(MAX(version), 0) FROM ontology_versions WHERE workspace_id = $1`,
			workspaceID,
		).Scan(&maxVersion)

		pool.Exec(r.Context(),
			`INSERT INTO ontology_versions (workspace_id, version, snapshot, change_summary, published, created_at)
			 VALUES ($1, $2, $3, 'Rollback to v' || $4::text, false, NOW())`,
			workspaceID, maxVersion+1, snapshot, version,
		)

		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"rolledBackTo": version,
			"newVersion":   maxVersion + 1,
		})
	}
}

// PublishWorkspace marks the latest compiled version as published.
func PublishWorkspace(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID := chi.URLParam(r, "workspaceId")

		// Get latest version
		var versionID string
		err := pool.QueryRow(r.Context(),
			`SELECT id FROM ontology_versions WHERE workspace_id = $1 ORDER BY version DESC LIMIT 1`,
			workspaceID,
		).Scan(&versionID)
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "NOT_COMPILED", "compile the workspace before publishing")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}

		now := time.Now().UTC()
		pool.Exec(r.Context(),
			`UPDATE ontology_versions SET published = true, published_at = $1 WHERE id = $2`,
			now, versionID,
		)
		pool.Exec(r.Context(),
			`UPDATE ontology_workspaces SET status = 'published', published_at = $1, updated_at = $1 WHERE id = $2`,
			now, workspaceID,
		)

		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"workspaceId": workspaceID,
			"status":      "published",
			"publishedAt": now,
		})
	}
}
