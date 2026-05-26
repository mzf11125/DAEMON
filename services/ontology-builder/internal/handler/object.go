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

// ObjectHandler handles object type CRUD.
type ObjectHandler struct {
	pool *pgxpool.Pool
}

func NewObjectHandler(pool *pgxpool.Pool) *ObjectHandler {
	return &ObjectHandler{pool: pool}
}

type ObjectType struct {
	ID           string    `json:"id"`
	WorkspaceID  string    `json:"workspaceId"`
	APIName      string    `json:"apiName"`
	DisplayName  string    `json:"displayName"`
	PrimaryKey   string    `json:"primaryKey"`
	TitleProp    string    `json:"titleProperty"`
	Description  string    `json:"description,omitempty"`
	Icon         string    `json:"icon,omitempty"`
	Category     string    `json:"category,omitempty"`
	SortOrder    int       `json:"sortOrder"`
	Properties   []Property `json:"properties"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Property struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Type         string `json:"type"`
	Required     bool   `json:"required"`
	Config       json.RawMessage `json:"config,omitempty"`
	SortOrder    int    `json:"sortOrder"`
}

type CreateObjectRequest struct {
	APIName     string          `json:"apiName"`
	DisplayName string          `json:"displayName"`
	PrimaryKey  string          `json:"primaryKey"`
	TitleProp   string          `json:"titleProperty"`
	Description string          `json:"description,omitempty"`
	Icon        string          `json:"icon,omitempty"`
	Category    string          `json:"category,omitempty"`
	Properties  []PropertyInput `json:"properties"`
}

type PropertyInput struct {
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Required bool            `json:"required"`
	Config   json.RawMessage `json:"config,omitempty"`
}

// List returns all object types in a workspace.
func (h *ObjectHandler) List(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	var total int
	var objects []ObjectType

	if err := h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM ontology_object_types WHERE workspace_id = $1`, workspaceID,
	).Scan(&total); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, primary_key, title_property,
		        description, icon, category, sort_order, created_at, updated_at
		 FROM ontology_object_types WHERE workspace_id = $1 ORDER BY sort_order, api_name`,
		workspaceID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	defer rows.Close()

	for rows.Next() {
		var obj ObjectType
		if err := rows.Scan(&obj.ID, &obj.WorkspaceID, &obj.APIName, &obj.DisplayName,
			&obj.PrimaryKey, &obj.TitleProp, &obj.Description, &obj.Icon, &obj.Category,
			&obj.SortOrder, &obj.CreatedAt, &obj.UpdatedAt); err != nil {
			continue
		}
		obj.Properties = h.loadProperties(r, obj.ID)
		objects = append(objects, obj)
	}
	if objects == nil {
		objects = []ObjectType{}
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{
		"objectTypes": objects,
		"total":       total,
	})
}

func (h *ObjectHandler) loadProperties(r *http.Request, objectTypeID string) []Property {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, name, type, required, config, sort_order
		 FROM ontology_properties WHERE object_type_id = $1 ORDER BY sort_order, name`,
		objectTypeID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var props []Property
	for rows.Next() {
		var p Property
		var configBytes []byte
		if err := rows.Scan(&p.ID, &p.Name, &p.Type, &p.Required, &configBytes, &p.SortOrder); err != nil {
			continue
		}
		p.Config = json.RawMessage(configBytes)
		props = append(props, p)
	}
	if props == nil {
		props = []Property{}
	}
	return props
}

// Create creates a new object type with its properties.
func (h *ObjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	var req CreateObjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.APIName == "" || req.DisplayName == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "apiName and displayName are required")
		return
	}
	if req.PrimaryKey == "" {
		req.PrimaryKey = "id"
	}
	if req.TitleProp == "" && len(req.Properties) > 0 {
		req.TitleProp = req.Properties[0].Name
	}

	now := time.Now().UTC()
	objID := uuid.New().String()

	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_object_types (id, workspace_id, api_name, display_name, primary_key, title_property, description, icon, category, sort_order, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$10)`,
		objID, workspaceID, req.APIName, req.DisplayName, req.PrimaryKey, req.TitleProp,
		req.Description, req.Icon, req.Category, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE", "object type with this apiName already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	// Insert properties
	for i, prop := range req.Properties {
		propID := uuid.New().String()
		config := prop.Config
		if config == nil {
			config = json.RawMessage("{}")
		}
		h.pool.Exec(r.Context(),
			`INSERT INTO ontology_properties (id, object_type_id, name, type, required, config, sort_order, created_at, updated_at)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
			propID, objID, prop.Name, prop.Type, prop.Required, config, i, now,
		)
	}

	dhttp.WriteJSON(w, http.StatusCreated, map[string]any{
		"id":            objID,
		"apiName":       req.APIName,
		"propertyCount": len(req.Properties),
	})
}

// Get returns a single object type.
func (h *ObjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	objID := chi.URLParam(r, "objectTypeId")
	var obj ObjectType
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, primary_key, title_property,
		        description, icon, category, sort_order, created_at, updated_at
		 FROM ontology_object_types WHERE id = $1`, objID,
	).Scan(&obj.ID, &obj.WorkspaceID, &obj.APIName, &obj.DisplayName,
		&obj.PrimaryKey, &obj.TitleProp, &obj.Description, &obj.Icon, &obj.Category,
		&obj.SortOrder, &obj.CreatedAt, &obj.UpdatedAt)
	if err == pgx.ErrNoRows {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "object type not found")
		return
	}
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	obj.Properties = h.loadProperties(r, objID)
	dhttp.WriteJSON(w, http.StatusOK, obj)
}

// Update updates an object type.
func (h *ObjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	objID := chi.URLParam(r, "objectTypeId")
	var req struct {
		DisplayName *string `json:"displayName,omitempty"`
		Description *string `json:"description,omitempty"`
		Icon        *string `json:"icon,omitempty"`
		Category    *string `json:"category,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`UPDATE ontology_object_types SET updated_at = $1,
		 display_name = COALESCE($2, display_name),
		 description = COALESCE($3, description),
		 icon = COALESCE($4, icon),
		 category = COALESCE($5, category)
		 WHERE id = $6`, now, req.DisplayName, req.Description, req.Icon, req.Category, objID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"id": objID, "updatedAt": now})
}

// Delete deletes an object type and cascades to properties.
func (h *ObjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	objID := chi.URLParam(r, "objectTypeId")
	tag, err := h.pool.Exec(r.Context(),
		`DELETE FROM ontology_object_types WHERE id = $1`, objID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "object type not found")
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// AddProperty adds a new property to an object type.
func (h *ObjectHandler) AddProperty(w http.ResponseWriter, r *http.Request) {
	objID := chi.URLParam(r, "objectTypeId")
	var prop PropertyInput
	if err := json.NewDecoder(r.Body).Decode(&prop); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if prop.Name == "" || prop.Type == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "name and type required")
		return
	}

	now := time.Now().UTC()
	propID := uuid.New().String()
	config := prop.Config
	if config == nil {
		config = json.RawMessage("{}")
	}
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_properties (id, object_type_id, name, type, required, config, sort_order, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,0,$7,$7)`,
		propID, objID, prop.Name, prop.Type, prop.Required, config, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE", "property with this name already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusCreated, map[string]any{"id": propID, "name": prop.Name})
}

// UpdateProperty updates a property.
func (h *ObjectHandler) UpdateProperty(w http.ResponseWriter, r *http.Request) {
	propID := chi.URLParam(r, "propId")
	var req struct {
		Required *bool            `json:"required,omitempty"`
		Config   *json.RawMessage `json:"config,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`UPDATE ontology_properties SET updated_at = $1,
		 required = COALESCE($2, required),
		 config = COALESCE($3, config)
		 WHERE id = $4`, now, req.Required, req.Config, propID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"id": propID, "updatedAt": now})
}

// DeleteProperty deletes a property.
func (h *ObjectHandler) DeleteProperty(w http.ResponseWriter, r *http.Request) {
	propID := chi.URLParam(r, "propId")
	tag, err := h.pool.Exec(r.Context(),
		`DELETE FROM ontology_properties WHERE id = $1`, propID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "property not found")
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// Reorder reorders object types.
func (h *ObjectHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OrderedIDs []string `json:"orderedIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	for i, id := range req.OrderedIDs {
		h.pool.Exec(r.Context(),
			`UPDATE ontology_object_types SET sort_order = $1 WHERE id = $2`, i, id,
		)
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"reordered": len(req.OrderedIDs)})
}
