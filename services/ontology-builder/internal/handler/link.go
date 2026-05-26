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

type LinkHandler struct {
	pool *pgxpool.Pool
}

func NewLinkHandler(pool *pgxpool.Pool) *LinkHandler {
	return &LinkHandler{pool: pool}
}

type LinkType struct {
	ID             string    `json:"id"`
	WorkspaceID    string    `json:"workspaceId"`
	APIName        string    `json:"apiName"`
	DisplayName    string    `json:"displayName"`
	FromObjectType string    `json:"fromObjectType"`
	ToObjectType   string    `json:"toObjectType"`
	Cardinality    string    `json:"cardinality"`
	Description    string    `json:"description,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type CreateLinkRequest struct {
	APIName        string `json:"apiName"`
	DisplayName    string `json:"displayName"`
	FromObjectType string `json:"fromObjectType"`
	ToObjectType   string `json:"toObjectType"`
	Cardinality    string `json:"cardinality"`
	Description    string `json:"description,omitempty"`
}

func (h *LinkHandler) List(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, from_object_type, to_object_type,
		        cardinality, description, created_at, updated_at
		 FROM ontology_link_types WHERE workspace_id = $1 ORDER BY api_name`, workspaceID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	defer rows.Close()

	var links []LinkType
	for rows.Next() {
		var l LinkType
		if err := rows.Scan(&l.ID, &l.WorkspaceID, &l.APIName, &l.DisplayName,
			&l.FromObjectType, &l.ToObjectType, &l.Cardinality, &l.Description,
			&l.CreatedAt, &l.UpdatedAt); err != nil {
			continue
		}
		links = append(links, l)
	}
	if links == nil {
		links = []LinkType{}
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"linkTypes": links})
}

func (h *LinkHandler) Create(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	var req CreateLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.APIName == "" || req.DisplayName == "" || req.FromObjectType == "" || req.ToObjectType == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "apiName, displayName, fromObjectType, toObjectType are required")
		return
	}
	if req.Cardinality == "" {
		req.Cardinality = "MANY_TO_MANY"
	}

	now := time.Now().UTC()
	id := uuid.New().String()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_link_types (id, workspace_id, api_name, display_name, from_object_type, to_object_type, cardinality, description, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
		id, workspaceID, req.APIName, req.DisplayName, req.FromObjectType, req.ToObjectType,
		req.Cardinality, req.Description, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE", "link type with this apiName already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusCreated, map[string]any{"id": id, "apiName": req.APIName})
}

func (h *LinkHandler) Get(w http.ResponseWriter, r *http.Request) {
	linkID := chi.URLParam(r, "linkId")
	var l LinkType
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, from_object_type, to_object_type,
		        cardinality, description, created_at, updated_at
		 FROM ontology_link_types WHERE id = $1`, linkID,
	).Scan(&l.ID, &l.WorkspaceID, &l.APIName, &l.DisplayName,
		&l.FromObjectType, &l.ToObjectType, &l.Cardinality, &l.Description,
		&l.CreatedAt, &l.UpdatedAt)
	if err == pgx.ErrNoRows {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "link type not found")
		return
	}
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, l)
}

func (h *LinkHandler) Update(w http.ResponseWriter, r *http.Request) {
	linkID := chi.URLParam(r, "linkId")
	var req struct {
		DisplayName *string `json:"displayName,omitempty"`
		Description *string `json:"description,omitempty"`
		Cardinality *string `json:"cardinality,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`UPDATE ontology_link_types SET updated_at = $1,
		 display_name = COALESCE($2, display_name),
		 description = COALESCE($3, description),
		 cardinality = COALESCE($4, cardinality)
		 WHERE id = $5`, now, req.DisplayName, req.Description, req.Cardinality, linkID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"id": linkID, "updatedAt": now})
}

func (h *LinkHandler) Delete(w http.ResponseWriter, r *http.Request) {
	linkID := chi.URLParam(r, "linkId")
	tag, err := h.pool.Exec(r.Context(), `DELETE FROM ontology_link_types WHERE id = $1`, linkID)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "link type not found")
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}
