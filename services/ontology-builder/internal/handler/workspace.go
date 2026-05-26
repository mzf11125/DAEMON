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

// WorkspaceHandler handles workspace CRUD operations.
type WorkspaceHandler struct {
	pool *pgxpool.Pool
}

func NewWorkspaceHandler(pool *pgxpool.Pool) *WorkspaceHandler {
	return &WorkspaceHandler{pool: pool}
}

type Workspace struct {
	ID             string     `json:"id"`
	TenantID       string     `json:"tenantId"`
	Name           string     `json:"name"`
	Description    string     `json:"description,omitempty"`
	Status         string     `json:"status"`
	BaseManifestID *string    `json:"baseManifestId,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	PublishedAt    *time.Time `json:"publishedAt,omitempty"`
}

type WorkspaceListResponse struct {
	Items []Workspace              `json:"items"`
	Meta  map[string]any           `json:"meta"`
}

type CreateWorkspaceRequest struct {
	Name           string  `json:"name"`
	Description    string  `json:"description,omitempty"`
	BaseTemplateID *string `json:"baseTemplateId,omitempty"`
}

// List returns all workspaces for the requesting tenant.
func (h *WorkspaceHandler) List(w http.ResponseWriter, r *http.Request) {
	tenant := dhttp.TenantFromContext(r.Context())
	limit, offset := dhttp.ParseListPagination(r)

	var total int
	var workspaces []Workspace

	err := h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM ontology_workspaces WHERE tenant_id = $1`, tenant,
	).Scan(&total)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, tenant_id, name, description, status, base_manifest_id, created_at, updated_at, published_at
		 FROM ontology_workspaces WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
		tenant, limit, offset,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	defer rows.Close()

	for rows.Next() {
		var ws Workspace
		if err := rows.Scan(&ws.ID, &ws.TenantID, &ws.Name, &ws.Description, &ws.Status,
			&ws.BaseManifestID, &ws.CreatedAt, &ws.UpdatedAt, &ws.PublishedAt); err != nil {
			continue
		}
		workspaces = append(workspaces, ws)
	}
	if workspaces == nil {
		workspaces = []Workspace{}
	}
	dhttp.WriteJSON(w, http.StatusOK, WorkspaceListResponse{
		Items: workspaces,
		Meta:  dhttp.ListMeta(total, limit, offset, len(workspaces)),
	})
}

// Create creates a new workspace. If baseTemplateId is provided, deep-clones from the template.
func (h *WorkspaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenant := dhttp.TenantFromContext(r.Context())
	var req CreateWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.Name == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "name is required")
		return
	}

	id := uuid.New().String()
	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_workspaces (id, tenant_id, name, description, status, base_manifest_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, 'draft', $5, $6, $6)`,
		id, tenant, req.Name, req.Description, req.BaseTemplateID, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE", "workspace with this name already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	// Deep-clone from template if baseTemplateId is provided
	if req.BaseTemplateID != nil && *req.BaseTemplateID != "" {
		var snapshot []byte
		err := h.pool.QueryRow(r.Context(),
			`SELECT snapshot FROM ontology_templates WHERE id = $1`, *req.BaseTemplateID,
		).Scan(&snapshot)
		if err == nil && len(snapshot) > 0 {
			var manifest map[string]any
			if json.Unmarshal(snapshot, &manifest) == nil {
				cloneTemplateContent(h.pool, r, id, manifest, now)
			}
		}
	}

	ws := Workspace{
		ID:             id,
		TenantID:       tenant,
		Name:           req.Name,
		Description:    req.Description,
		Status:         "draft",
		BaseManifestID: req.BaseTemplateID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	dhttp.WriteJSON(w, http.StatusCreated, ws)
}

// cloneTemplateContent deep-clones object/link/action types from a template snapshot into a workspace.
func cloneTemplateContent(pool *pgxpool.Pool, r *http.Request, workspaceID string, manifest map[string]any, now time.Time) {
	// Import object types
	if objTypes, ok := manifest["objectTypes"].([]any); ok {
		for _, ot := range objTypes {
			objMap, ok := ot.(map[string]any)
			if !ok {
				continue
			}
			apiName, _ := objMap["apiName"].(string)
			displayName, _ := objMap["displayName"].(string)
			if apiName == "" || displayName == "" {
				continue
			}
			pk, _ := objMap["primaryKey"].(string)
			if pk == "" {
				pk = "id"
			}
			titleProp, _ := objMap["titleProperty"].(string)

			objID := uuid.New().String()
			_, err := pool.Exec(r.Context(),
				`INSERT INTO ontology_object_types (id, workspace_id, api_name, display_name, primary_key, title_property, sort_order, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,0,$7,$7)`,
				objID, workspaceID, apiName, displayName, pk, titleProp, now,
			)
			if err != nil {
				continue
			}

			// Clone properties
			if props, ok := objMap["properties"].([]any); ok {
				for i, p := range props {
					propMap, ok := p.(map[string]any)
					if !ok {
						continue
					}
					pName, _ := propMap["name"].(string)
					pType, _ := propMap["type"].(string)
					if pName == "" || pType == "" {
						continue
					}
					required, _ := propMap["required"].(bool)
					config := json.RawMessage("{}")
					if cfg, ok := propMap["config"]; ok && cfg != nil {
						cfgBytes, _ := json.Marshal(cfg)
						config = cfgBytes
					}
					propID := uuid.New().String()
					pool.Exec(r.Context(),
						`INSERT INTO ontology_properties (id, object_type_id, name, type, required, config, sort_order, created_at, updated_at)
						 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
						propID, objID, pName, pType, required, config, i, now,
					)
				}
			}
		}
	}

	// Import link types
	if linkTypes, ok := manifest["linkTypes"].([]any); ok {
		for _, lt := range linkTypes {
			linkMap, ok := lt.(map[string]any)
			if !ok {
				continue
			}
			apiName, _ := linkMap["apiName"].(string)
			fromType, _ := linkMap["fromObjectType"].(string)
			toType, _ := linkMap["toObjectType"].(string)
			if apiName == "" || fromType == "" || toType == "" {
				continue
			}
			cardinality, _ := linkMap["cardinality"].(string)
			displayName := apiName
			if dn, ok := linkMap["displayName"].(string); ok && dn != "" {
				displayName = dn
			}

			linkID := uuid.New().String()
			pool.Exec(r.Context(),
				`INSERT INTO ontology_link_types (id, workspace_id, api_name, display_name, from_object_type, to_object_type, cardinality, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
				linkID, workspaceID, apiName, displayName, fromType, toType, cardinality, now,
			)
		}
	}

	// Import action types
	if actTypes, ok := manifest["actionTypes"].([]any); ok {
		for _, at := range actTypes {
			actMap, ok := at.(map[string]any)
			if !ok {
				continue
			}
			apiName, _ := actMap["apiName"].(string)
			displayName, _ := actMap["displayName"].(string)
			targetType, _ := actMap["targetObjectType"].(string)
			if apiName == "" || displayName == "" || targetType == "" {
				continue
			}
			requiresApproval, _ := actMap["requiresApproval"].(bool)

			actID := uuid.New().String()
			pool.Exec(r.Context(),
				`INSERT INTO ontology_action_types (id, workspace_id, api_name, display_name, target_object_type, requires_approval, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
				actID, workspaceID, apiName, displayName, targetType, requiresApproval, now,
			)

			if params, ok := actMap["parameters"].([]any); ok {
				for _, p := range params {
					paramMap, ok := p.(map[string]any)
					if !ok {
						continue
					}
					pName, _ := paramMap["name"].(string)
					pType, _ := paramMap["type"].(string)
					if pName == "" || pType == "" {
						continue
					}
					required, _ := paramMap["required"].(bool)
					config := json.RawMessage("{}")
					if cfg, ok := paramMap["config"]; ok && cfg != nil {
						cfgBytes, _ := json.Marshal(cfg)
						config = cfgBytes
					}
					paramID := uuid.New().String()
					pool.Exec(r.Context(),
						`INSERT INTO ontology_action_params (id, action_type_id, name, type, required, config, sort_order)
						 VALUES ($1,$2,$3,$4,$5,$6,0)`,
						paramID, actID, pName, pType, required, config,
					)
				}
			}
		}
	}
}

// Get returns a single workspace.
func (h *WorkspaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenant := dhttp.TenantFromContext(r.Context())
	id := chi.URLParam(r, "workspaceId")

	var ws Workspace
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, tenant_id, name, description, status, base_manifest_id, created_at, updated_at, published_at
		 FROM ontology_workspaces WHERE id = $1 AND tenant_id = $2`, id, tenant,
	).Scan(&ws.ID, &ws.TenantID, &ws.Name, &ws.Description, &ws.Status,
		&ws.BaseManifestID, &ws.CreatedAt, &ws.UpdatedAt, &ws.PublishedAt)
	if err == pgx.ErrNoRows {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "workspace not found")
		return
	}
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}

	// Get summary counts
	var objCount, linkCount, actionCount int
	_ = h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM ontology_object_types WHERE workspace_id = $1`, id,
	).Scan(&objCount)
	_ = h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM ontology_link_types WHERE workspace_id = $1`, id,
	).Scan(&linkCount)
	_ = h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM ontology_action_types WHERE workspace_id = $1`, id,
	).Scan(&actionCount)

	dhttp.WriteJSON(w, http.StatusOK, map[string]any{
		"workspace":   ws,
		"objectCount": objCount,
		"linkCount":   linkCount,
		"actionCount": actionCount,
	})
}

// Update updates workspace name/description.
func (h *WorkspaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenant := dhttp.TenantFromContext(r.Context())
	id := chi.URLParam(r, "workspaceId")

	var req struct {
		Name        *string `json:"name,omitempty"`
		Description *string `json:"description,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`UPDATE ontology_workspaces SET updated_at = $1
		 , name = COALESCE($2, name)
		 , description = COALESCE($3, description)
		 WHERE id = $4 AND tenant_id = $5`, now, req.Name, req.Description, id, tenant,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"id": id, "updatedAt": now})
}

// Delete deletes a workspace and all its contents.
func (h *WorkspaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenant := dhttp.TenantFromContext(r.Context())
	id := chi.URLParam(r, "workspaceId")

	tag, err := h.pool.Exec(r.Context(),
		`DELETE FROM ontology_workspaces WHERE id = $1 AND tenant_id = $2`, id, tenant,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "workspace not found")
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// Clone creates a new workspace from an existing one or template.
func (h *WorkspaceHandler) Clone(w http.ResponseWriter, r *http.Request) {
	tenant := dhttp.TenantFromContext(r.Context())
	id := chi.URLParam(r, "workspaceId")

	var req struct {
		SourceWorkspaceID *string `json:"sourceWorkspaceId,omitempty"`
		SourceTemplateID  *string `json:"sourceTemplateId,omitempty"`
		NewName           string  `json:"newName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.NewName == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "newName is required")
		return
	}

	_ = id // reserved for future use (clone into existing workspace)

	newID := uuid.New().String()
	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_workspaces (id, tenant_id, name, description, status, base_manifest_id, created_at, updated_at)
		 VALUES ($1, $2, $3, 'Cloned workspace', 'draft', $4, $5, $5)`,
		newID, tenant, req.NewName, req.SourceTemplateID, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE", "workspace with this name already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CLONE_FAILED", err.Error())
		return
	}

	// TODO: full deep-clone of object/link/action types from source
	// Phase 1 creates an empty workspace with base_manifest_id reference.

	dhttp.WriteJSON(w, http.StatusCreated, map[string]any{
		"id":   newID,
		"name": req.NewName,
	})
}
