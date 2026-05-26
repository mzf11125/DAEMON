package handler

import (
	"encoding/json"
	"net/http"
	"time"

	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ListTemplates returns all public templates.
func ListTemplates(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(r.Context(),
			`SELECT id, name, display_name, description, category, icon, tags, visibility, created_at
			 FROM ontology_templates WHERE visibility = 'public' ORDER BY category, name`,
		)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		defer rows.Close()

		type Template struct {
			ID          string    `json:"id"`
			Name        string    `json:"name"`
			DisplayName string    `json:"displayName"`
			Description string    `json:"description,omitempty"`
			Category    string    `json:"category,omitempty"`
			Icon        string    `json:"icon,omitempty"`
			Tags        []string  `json:"tags,omitempty"`
			Visibility  string    `json:"visibility"`
			CreatedAt   time.Time `json:"createdAt"`
		}

		var templates []Template
		for rows.Next() {
			var t Template
			if err := rows.Scan(&t.ID, &t.Name, &t.DisplayName, &t.Description,
				&t.Category, &t.Icon, &t.Tags, &t.Visibility, &t.CreatedAt); err != nil {
				continue
			}
			templates = append(templates, t)
		}
		if templates == nil {
			templates = []Template{}
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{"templates": templates})
	}
}

// GetTemplate returns a single template with its full snapshot.
func GetTemplate(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "templateId")
		var name, displayName, description, category, icon string
		var tags []string
		var visibility string
		var snapshot []byte
		var createdAt time.Time
		err := pool.QueryRow(r.Context(),
			`SELECT name, display_name, description, category, icon, tags, visibility, snapshot, created_at
			 FROM ontology_templates WHERE id = $1`, id,
		).Scan(&name, &displayName, &description, &category, &icon, &tags, &visibility, &snapshot, &createdAt)
		if err == pgx.ErrNoRows {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "template not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
			return
		}
		var snap map[string]any
		json.Unmarshal(snapshot, &snap)
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"id":          id,
			"name":        name,
			"displayName": displayName,
			"description": description,
			"category":    category,
			"icon":        icon,
			"tags":        tags,
			"snapshot":    snap,
		})
	}
}

// CreateTemplate saves a workspace as a template.
func CreateTemplate(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		var req struct {
			WorkspaceID string `json:"workspaceId"`
			Name        string `json:"name"`
			DisplayName string `json:"displayName"`
			Description string `json:"description,omitempty"`
			Visibility  string `json:"visibility,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
			return
		}
		if req.WorkspaceID == "" || req.Name == "" || req.DisplayName == "" {
			dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "workspaceId, name, displayName required")
			return
		}
		if req.Visibility == "" {
			req.Visibility = "public"
		}

		manifest := buildManifest(pool, r, req.WorkspaceID)
		snapshot, _ := json.Marshal(manifest)

		id := uuid.New().String()
		_, err := pool.Exec(r.Context(),
			`INSERT INTO ontology_templates (id, name, display_name, description, visibility, owner_tenant_id, snapshot, created_at, updated_at)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
			id, req.Name, req.DisplayName, req.Description, req.Visibility, tenant, snapshot,
		)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
			return
		}
		dhttp.WriteJSON(w, http.StatusCreated, map[string]any{"id": id, "name": req.Name})
	}
}
