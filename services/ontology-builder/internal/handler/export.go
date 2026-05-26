package handler

import (
	"encoding/json"
	"net/http"
	"time"

	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ExportHandler handles workspace export/import operations.
type ExportHandler struct {
	pool *pgxpool.Pool
}

func NewExportHandler(pool *pgxpool.Pool) *ExportHandler {
	return &ExportHandler{pool: pool}
}

// ExportResponse is the JSON structure returned when exporting a workspace.
type ExportResponse struct {
	Manifest   map[string]any `json:"manifest"`
	Rules      []any          `json:"rules"`
	ExportedAt time.Time      `json:"exportedAt"`
	Version    string         `json:"version"`
}

// Export exports a workspace as a portable JSON bundle (manifest + rules).
func (h *ExportHandler) Export(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	tenant := dhttp.TenantFromContext(r.Context())

	// Build manifest from workspace
	manifest := buildManifest(h.pool, r, workspaceID)
	if manifest == nil {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "workspace has no data")
		return
	}

	// Add workspace metadata
	var ws Workspace
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, tenant_id, name, description, status, base_manifest_id, created_at, updated_at, published_at
		 FROM ontology_workspaces WHERE id = $1 AND tenant_id = $2`, workspaceID, tenant,
	).Scan(&ws.ID, &ws.TenantID, &ws.Name, &ws.Description, &ws.Status,
		&ws.BaseManifestID, &ws.CreatedAt, &ws.UpdatedAt, &ws.PublishedAt)
	if err == nil {
		manifest["workspaceName"] = ws.Name
		manifest["workspaceDescription"] = ws.Description
		manifest["workspaceStatus"] = ws.Status
	}

	// Load rules
	var rules []any
	ruleRows, err := h.pool.Query(r.Context(),
		`SELECT id, api_name, display_name, source_object_type,
		        schedule, condition_logic, conditions, signal_config, created_at, updated_at
		 FROM ontology_rules WHERE workspace_id = $1 ORDER BY api_name`, workspaceID,
	)
	if err == nil {
		defer ruleRows.Close()
		for ruleRows.Next() {
			var id, apiName, displayName, sourceObj, schedule, conditionLogic string
			var condBytes, sigBytes []byte
			var createdAt, updatedAt time.Time
			if err := ruleRows.Scan(&id, &apiName, &displayName, &sourceObj,
				&schedule, &conditionLogic, &condBytes, &sigBytes, &createdAt, &updatedAt); err != nil {
				continue
			}
			var conditions any
			json.Unmarshal(condBytes, &conditions)
			var signal any
			json.Unmarshal(sigBytes, &signal)

			rules = append(rules, map[string]any{
				"id":               id,
				"apiName":          apiName,
				"displayName":      displayName,
				"sourceObjectType": sourceObj,
				"schedule":         schedule,
				"conditionLogic":   conditionLogic,
				"conditions":       conditions,
				"signal":           signal,
				"createdAt":        createdAt,
				"updatedAt":        updatedAt,
			})
		}
	}
	if rules == nil {
		rules = []any{}
	}

	resp := ExportResponse{
		Manifest:   manifest,
		Rules:      rules,
		ExportedAt: time.Now().UTC(),
		Version:    "2.0.0",
	}
	dhttp.WriteJSON(w, http.StatusOK, resp)
}

// Import imports a workspace from an exported JSON bundle.
func (h *ExportHandler) Import(w http.ResponseWriter, r *http.Request) {
	tenant := dhttp.TenantFromContext(r.Context())

	var req ExportResponse
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.Manifest == nil {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD", "manifest is required")
		return
	}

	// Determine workspace name
	wsName := "Imported Workspace"
	if name, ok := req.Manifest["workspaceName"].(string); ok && name != "" {
		wsName = name + " (imported)"
	}
	wsDesc := ""
	if desc, ok := req.Manifest["workspaceDescription"].(string); ok {
		wsDesc = desc
	}

	// Create new workspace
	wsID := uuid.New().String()
	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_workspaces (id, tenant_id, name, description, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, 'draft', $5, $5)`,
		wsID, tenant, wsName, wsDesc, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE",
				"workspace with name '"+wsName+"' already exists")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "IMPORT_FAILED", err.Error())
		return
	}

	// Import object types
	if objTypes, ok := req.Manifest["objectTypes"].([]any); ok {
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
			desc, _ := objMap["description"].(string)

			objID := uuid.New().String()
			_, err := h.pool.Exec(r.Context(),
				`INSERT INTO ontology_object_types (id, workspace_id, api_name, display_name, primary_key, title_property, description, sort_order, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$8)`,
				objID, wsID, apiName, displayName, pk, titleProp, desc, now,
			)
			if err != nil {
				continue // skip duplicates
			}

			// Import properties
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
						cfgBytes, err := json.Marshal(cfg)
						if err == nil {
							config = cfgBytes
						}
					}

					propID := uuid.New().String()
					h.pool.Exec(r.Context(),
						`INSERT INTO ontology_properties (id, object_type_id, name, type, required, config, sort_order, created_at, updated_at)
						 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
						propID, objID, pName, pType, required, config, i, now,
					)
				}
			}
		}
	}

	// Import link types
	if linkTypes, ok := req.Manifest["linkTypes"].([]any); ok {
		for _, lt := range linkTypes {
			linkMap, ok := lt.(map[string]any)
			if !ok {
				continue
			}
			apiName, _ := linkMap["apiName"].(string)
			fromType, _ := linkMap["fromObjectType"].(string)
			toType, _ := linkMap["toObjectType"].(string)
			cardinality, _ := linkMap["cardinality"].(string)
			if apiName == "" || fromType == "" || toType == "" {
				continue
			}

			// Convert cardinality format
			cardMap := map[string]string{
				"one-to-one":   "ONE_TO_ONE",
				"one-to-many":  "ONE_TO_MANY",
				"many-to-one":  "MANY_TO_ONE",
				"many-to-many": "MANY_TO_MANY",
			}
			if mapped, ok := cardMap[cardinality]; ok {
				cardinality = mapped
			}

			linkID := uuid.New().String()
			displayName := apiName
			if dn, ok := linkMap["displayName"].(string); ok && dn != "" {
				displayName = dn
			}

			h.pool.Exec(r.Context(),
				`INSERT INTO ontology_link_types (id, workspace_id, api_name, display_name, from_object_type, to_object_type, cardinality, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
				linkID, wsID, apiName, displayName, fromType, toType, cardinality, now,
			)
		}
	}

	// Import action types
	if actTypes, ok := req.Manifest["actionTypes"].([]any); ok {
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
			h.pool.Exec(r.Context(),
				`INSERT INTO ontology_action_types (id, workspace_id, api_name, display_name, target_object_type, requires_approval, created_at, updated_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
				actID, wsID, apiName, displayName, targetType, requiresApproval, now,
			)

			// Import action parameters
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
						cfgBytes, err := json.Marshal(cfg)
						if err == nil {
							config = cfgBytes
						}
					}

					paramID := uuid.New().String()
					h.pool.Exec(r.Context(),
						`INSERT INTO ontology_action_params (id, action_type_id, name, type, required, config, sort_order)
						 VALUES ($1,$2,$3,$4,$5,$6,0)`,
						paramID, actID, pName, pType, required, config,
					)
				}
			}
		}
	}

	// Import rules
	for _, rl := range req.Rules {
		ruleMap, ok := rl.(map[string]any)
		if !ok {
			continue
		}
		apiName, _ := ruleMap["apiName"].(string)
		displayName, _ := ruleMap["displayName"].(string)
		sourceObj, _ := ruleMap["sourceObjectType"].(string)
		if apiName == "" || displayName == "" || sourceObj == "" {
			continue
		}

		schedule, _ := ruleMap["schedule"].(string)
		if schedule == "" {
			schedule = "*/15 * * * *"
		}
		conditionLogic, _ := ruleMap["conditionLogic"].(string)
		if conditionLogic == "" {
			conditionLogic = "AND"
		}

		conditions := json.RawMessage("[]")
		if conds, ok := ruleMap["conditions"]; ok && conds != nil {
			condsBytes, _ := json.Marshal(conds)
			conditions = condsBytes
		}

		signalConfig := json.RawMessage("{}")
		if sig, ok := ruleMap["signal"]; ok && sig != nil {
			sigBytes, _ := json.Marshal(sig)
			signalConfig = sigBytes
		}

		ruleID := uuid.New().String()
		h.pool.Exec(r.Context(),
			`INSERT INTO ontology_rules (id, workspace_id, api_name, display_name, source_object_type,
			 schedule, condition_logic, conditions, signal_config, created_at, updated_at)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
			ruleID, wsID, apiName, displayName, sourceObj,
			schedule, conditionLogic, conditions, signalConfig, now,
		)
	}

	// Return the newly created workspace info
	dhttp.WriteJSON(w, http.StatusCreated, map[string]any{
		"id":         wsID,
		"name":       wsName,
		"status":     "draft",
		"importedAt": now,
	})
}
