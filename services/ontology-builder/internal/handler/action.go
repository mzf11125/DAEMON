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

type ActionHandler struct {
	pool *pgxpool.Pool
}

func NewActionHandler(pool *pgxpool.Pool) *ActionHandler {
	return &ActionHandler{pool: pool}
}

type ActionType struct {
	ID                string            `json:"id"`
	WorkspaceID       string            `json:"workspaceId"`
	APIName           string            `json:"apiName"`
	DisplayName       string            `json:"displayName"`
	TargetObjectType  string            `json:"targetObjectType"`
	RequiresApproval  bool              `json:"requiresApproval"`
	Description       string            `json:"description,omitempty"`
	Parameters        []ActionParam     `json:"parameters"`
	CreatedAt         time.Time         `json:"createdAt"`
	UpdatedAt         time.Time         `json:"updatedAt"`
}

type ActionParam struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Required bool            `json:"required"`
	Config   json.RawMessage `json:"config,omitempty"`
	SortOrder int            `json:"sortOrder"`
}

type CreateActionRequest struct {
	APIName          string              `json:"apiName"`
	DisplayName      string              `json:"displayName"`
	TargetObjectType string              `json:"targetObjectType"`
	RequiresApproval bool                `json:"requiresApproval"`
	Description      string              `json:"description,omitempty"`
	Parameters       []ActionParamInput  `json:"parameters"`
}

type ActionParamInput struct {
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Required bool            `json:"required"`
	Config   json.RawMessage `json:"config,omitempty"`
}

func (h *ActionHandler) List(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, target_object_type,
		        requires_approval, description, created_at, updated_at
		 FROM ontology_action_types WHERE workspace_id = $1 ORDER BY api_name`, workspaceID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	defer rows.Close()

	var actions []ActionType
	for rows.Next() {
		var a ActionType
		if err := rows.Scan(&a.ID, &a.WorkspaceID, &a.APIName, &a.DisplayName,
			&a.TargetObjectType, &a.RequiresApproval, &a.Description,
			&a.CreatedAt, &a.UpdatedAt); err != nil {
			continue
		}
		a.Parameters = h.loadParams(r, a.ID)
		actions = append(actions, a)
	}
	if actions == nil {
		actions = []ActionType{}
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"actionTypes": actions})
}

func (h *ActionHandler) loadParams(r *http.Request, actionID string) []ActionParam {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, name, type, required, config, sort_order
		 FROM ontology_action_params WHERE action_type_id = $1 ORDER BY sort_order, name`,
		actionID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var params []ActionParam
	for rows.Next() {
		var p ActionParam
		var configBytes []byte
		if err := rows.Scan(&p.ID, &p.Name, &p.Type, &p.Required, &configBytes, &p.SortOrder); err != nil {
			continue
		}
		p.Config = json.RawMessage(configBytes)
		params = append(params, p)
	}
	if params == nil {
		params = []ActionParam{}
	}
	return params
}

func (h *ActionHandler) Create(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	var req CreateActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.APIName == "" || req.DisplayName == "" || req.TargetObjectType == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "apiName, displayName, targetObjectType are required")
		return
	}

	now := time.Now().UTC()
	id := uuid.New().String()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_action_types (id, workspace_id, api_name, display_name, target_object_type, requires_approval, description, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
		id, workspaceID, req.APIName, req.DisplayName, req.TargetObjectType,
		req.RequiresApproval, req.Description, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE", "action type with this apiName already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	for i, param := range req.Parameters {
		pid := uuid.New().String()
		config := param.Config
		if config == nil {
			config = json.RawMessage("{}")
		}
		h.pool.Exec(r.Context(),
			`INSERT INTO ontology_action_params (id, action_type_id, name, type, required, config, sort_order)
			 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			pid, id, param.Name, param.Type, param.Required, config, i,
		)
	}

	dhttp.WriteJSON(w, http.StatusCreated, map[string]any{"id": id, "apiName": req.APIName})
}

func (h *ActionHandler) Get(w http.ResponseWriter, r *http.Request) {
	actionID := chi.URLParam(r, "actionId")
	var a ActionType
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, target_object_type,
		        requires_approval, description, created_at, updated_at
		 FROM ontology_action_types WHERE id = $1`, actionID,
	).Scan(&a.ID, &a.WorkspaceID, &a.APIName, &a.DisplayName,
		&a.TargetObjectType, &a.RequiresApproval, &a.Description,
		&a.CreatedAt, &a.UpdatedAt)
	if err == pgx.ErrNoRows {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "action type not found")
		return
	}
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	a.Parameters = h.loadParams(r, actionID)
	dhttp.WriteJSON(w, http.StatusOK, a)
}

func (h *ActionHandler) Update(w http.ResponseWriter, r *http.Request) {
	actionID := chi.URLParam(r, "actionId")
	var req struct {
		DisplayName      *string `json:"displayName,omitempty"`
		Description      *string `json:"description,omitempty"`
		RequiresApproval *bool   `json:"requiresApproval,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`UPDATE ontology_action_types SET updated_at = $1,
		 display_name = COALESCE($2, display_name),
		 description = COALESCE($3, description),
		 requires_approval = COALESCE($4, requires_approval)
		 WHERE id = $5`, now, req.DisplayName, req.Description, req.RequiresApproval, actionID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"id": actionID, "updatedAt": now})
}

func (h *ActionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	actionID := chi.URLParam(r, "actionId")
	tag, err := h.pool.Exec(r.Context(), `DELETE FROM ontology_action_types WHERE id = $1`, actionID)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "action type not found")
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// AddParam adds a parameter to an action type.
func (h *ActionHandler) AddParam(w http.ResponseWriter, r *http.Request) {
	actionID := chi.URLParam(r, "actionId")
	var param ActionParamInput
	if err := json.NewDecoder(r.Body).Decode(&param); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if param.Name == "" || param.Type == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "name and type required")
		return
	}

	id := uuid.New().String()
	config := param.Config
	if config == nil {
		config = json.RawMessage("{}")
	}
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_action_params (id, action_type_id, name, type, required, config, sort_order)
		 VALUES ($1,$2,$3,$4,$5,$6,0)`,
		id, actionID, param.Name, param.Type, param.Required, config,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE", "parameter with this name already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusCreated, map[string]any{"id": id, "name": param.Name})
}

// UpdateParam updates an action parameter.
func (h *ActionHandler) UpdateParam(w http.ResponseWriter, r *http.Request) {
	paramID := chi.URLParam(r, "paramId")
	var req struct {
		Required *bool            `json:"required,omitempty"`
		Config   *json.RawMessage `json:"config,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	_, err := h.pool.Exec(r.Context(),
		`UPDATE ontology_action_params SET
		 required = COALESCE($1, required),
		 config = COALESCE($2, config)
		 WHERE id = $3`, req.Required, req.Config, paramID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"id": paramID})
}

// DeleteParam deletes an action parameter.
func (h *ActionHandler) DeleteParam(w http.ResponseWriter, r *http.Request) {
	paramID := chi.URLParam(r, "paramId")
	tag, err := h.pool.Exec(r.Context(), `DELETE FROM ontology_action_params WHERE id = $1`, paramID)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "parameter not found")
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}
