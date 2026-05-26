package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RuleHandler handles rule CRUD and compilation.
type RuleHandler struct {
	pool *pgxpool.Pool
}

func NewRuleHandler(pool *pgxpool.Pool) *RuleHandler {
	return &RuleHandler{pool: pool}
}

// Rule represents a workspace rule definition.
type Rule struct {
	ID               string          `json:"id"`
	WorkspaceID      string          `json:"workspaceId"`
	APIName          string          `json:"apiName"`
	DisplayName      string          `json:"displayName"`
	SourceObjectType string          `json:"sourceObjectType"`
	Schedule         string          `json:"schedule"`
	ConditionLogic   string          `json:"conditionLogic"`
	Conditions       json.RawMessage `json:"conditions"`
	SignalConfig     json.RawMessage `json:"signal"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// RuleCondition is a single condition within a rule.
type RuleCondition struct {
	Field string `json:"field"`
	Op    string `json:"op"`
	Value any    `json:"value"`
}

// SignalConfig is the signal generation configuration for a rule.
type SignalConfig struct {
	Severity       string `json:"severity"`
	TitleTemplate  string `json:"titleTemplate"`
}

// CreateRuleRequest is the request body for creating a rule.
type CreateRuleRequest struct {
	APIName          string          `json:"apiName"`
	DisplayName      string          `json:"displayName"`
	SourceObjectType string          `json:"sourceObjectType"`
	Schedule         string          `json:"schedule,omitempty"`
	ConditionLogic   string          `json:"conditionLogic,omitempty"`
	Conditions       json.RawMessage `json:"conditions"`
	SignalConfig     json.RawMessage `json:"signal"`
}

// UpdateRuleRequest is the request body for updating a rule.
type UpdateRuleRequest struct {
	DisplayName      *string          `json:"displayName,omitempty"`
	SourceObjectType *string          `json:"sourceObjectType,omitempty"`
	Schedule         *string          `json:"schedule,omitempty"`
	ConditionLogic   *string          `json:"conditionLogic,omitempty"`
	Conditions       *json.RawMessage `json:"conditions,omitempty"`
	SignalConfig     *json.RawMessage `json:"signal,omitempty"`
}

// List returns all rules for a workspace.
func (h *RuleHandler) List(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, source_object_type,
		        schedule, condition_logic, conditions, signal_config, created_at, updated_at
		 FROM ontology_rules WHERE workspace_id = $1 ORDER BY api_name`, workspaceID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	defer rows.Close()

	var rules []Rule
	for rows.Next() {
		var rule Rule
		var condBytes, sigBytes []byte
		if err := rows.Scan(&rule.ID, &rule.WorkspaceID, &rule.APIName, &rule.DisplayName,
			&rule.SourceObjectType, &rule.Schedule, &rule.ConditionLogic,
			&condBytes, &sigBytes, &rule.CreatedAt, &rule.UpdatedAt); err != nil {
			continue
		}
		rule.Conditions = json.RawMessage(condBytes)
		rule.SignalConfig = json.RawMessage(sigBytes)
		rules = append(rules, rule)
	}
	if rules == nil {
		rules = []Rule{}
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"rules": rules})
}

// Create creates a new rule for a workspace.
func (h *RuleHandler) Create(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")

	var req CreateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if req.APIName == "" || req.DisplayName == "" || req.SourceObjectType == "" {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "MISSING_FIELD",
			"apiName, displayName, sourceObjectType are required")
		return
	}

	// Validate source object type exists in workspace
	var objExists int
	h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM ontology_object_types WHERE workspace_id = $1 AND api_name = $2`,
		workspaceID, req.SourceObjectType,
	).Scan(&objExists)
	if objExists == 0 {
		dhttp.WriteErrorRequest(w, r, dhttp.StatusUnprocessable, "INVALID_REFERENCE",
			fmt.Sprintf("sourceObjectType '%s' does not exist in this workspace", req.SourceObjectType))
		return
	}

	if req.Schedule == "" {
		req.Schedule = "*/15 * * * *"
	}
	if req.ConditionLogic == "" {
		req.ConditionLogic = "AND"
	}

	conditions := req.Conditions
	if conditions == nil || string(conditions) == "" {
		conditions = json.RawMessage("[]")
	}
	signalConfig := req.SignalConfig
	if signalConfig == nil || string(signalConfig) == "" {
		signalConfig = json.RawMessage("{}")
	}

	id := uuid.New().String()
	now := time.Now().UTC()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO ontology_rules (id, workspace_id, api_name, display_name, source_object_type,
		 schedule, condition_logic, conditions, signal_config, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
		id, workspaceID, req.APIName, req.DisplayName, req.SourceObjectType,
		req.Schedule, req.ConditionLogic, conditions, signalConfig, now,
	)
	if err != nil {
		if isUniqueViolation(err) {
			dhttp.WriteErrorRequest(w, r, http.StatusConflict, "DUPLICATE",
				"rule with this apiName already exists in workspace")
			return
		}
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	dhttp.WriteJSON(w, http.StatusCreated, Rule{
		ID:               id,
		WorkspaceID:      workspaceID,
		APIName:          req.APIName,
		DisplayName:      req.DisplayName,
		SourceObjectType: req.SourceObjectType,
		Schedule:         req.Schedule,
		ConditionLogic:   req.ConditionLogic,
		Conditions:       conditions,
		SignalConfig:     signalConfig,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
}

// Get returns a single rule.
func (h *RuleHandler) Get(w http.ResponseWriter, r *http.Request) {
	ruleID := chi.URLParam(r, "ruleId")

	var rule Rule
	var condBytes, sigBytes []byte
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, source_object_type,
		        schedule, condition_logic, conditions, signal_config, created_at, updated_at
		 FROM ontology_rules WHERE id = $1`, ruleID,
	).Scan(&rule.ID, &rule.WorkspaceID, &rule.APIName, &rule.DisplayName,
		&rule.SourceObjectType, &rule.Schedule, &rule.ConditionLogic,
		&condBytes, &sigBytes, &rule.CreatedAt, &rule.UpdatedAt)
	if err == pgx.ErrNoRows {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "rule not found")
		return
	}
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	rule.Conditions = json.RawMessage(condBytes)
	rule.SignalConfig = json.RawMessage(sigBytes)

	dhttp.WriteJSON(w, http.StatusOK, rule)
}

// Update updates a rule.
func (h *RuleHandler) Update(w http.ResponseWriter, r *http.Request) {
	ruleID := chi.URLParam(r, "ruleId")

	var req UpdateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	now := time.Now().UTC()
	tag, err := h.pool.Exec(r.Context(),
		`UPDATE ontology_rules SET updated_at = $1,
		 display_name = COALESCE($2, display_name),
		 source_object_type = COALESCE($3, source_object_type),
		 schedule = COALESCE($4, schedule),
		 condition_logic = COALESCE($5, condition_logic),
		 conditions = COALESCE($6, conditions),
		 signal_config = COALESCE($7, signal_config)
		 WHERE id = $8`,
		now, req.DisplayName, req.SourceObjectType, req.Schedule,
		req.ConditionLogic, req.Conditions, req.SignalConfig, ruleID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "rule not found")
		return
	}

	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"id": ruleID, "updatedAt": now})
}

// Delete deletes a rule.
func (h *RuleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ruleID := chi.URLParam(r, "ruleId")

	tag, err := h.pool.Exec(r.Context(),
		`DELETE FROM ontology_rules WHERE id = $1`, ruleID,
	)
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "rule not found")
		return
	}
	dhttp.WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// Compile compiles a rule into its JSON representation (suitable for the rules engine).
func (h *RuleHandler) Compile(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceId")
	ruleID := chi.URLParam(r, "ruleId")

	var rule Rule
	var condBytes, sigBytes []byte
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, workspace_id, api_name, display_name, source_object_type,
		        schedule, condition_logic, conditions, signal_config, created_at, updated_at
		 FROM ontology_rules WHERE id = $1 AND workspace_id = $2`, ruleID, workspaceID,
	).Scan(&rule.ID, &rule.WorkspaceID, &rule.APIName, &rule.DisplayName,
		&rule.SourceObjectType, &rule.Schedule, &rule.ConditionLogic,
		&condBytes, &sigBytes, &rule.CreatedAt, &rule.UpdatedAt)
	if err == pgx.ErrNoRows {
		dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "rule not found")
		return
	}
	if err != nil {
		dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}
	rule.Conditions = json.RawMessage(condBytes)
	rule.SignalConfig = json.RawMessage(sigBytes)

	// Parse conditions
	var conditions []RuleCondition
	json.Unmarshal(condBytes, &conditions)

	// Parse signal config
	var sigCfg SignalConfig
	json.Unmarshal(sigBytes, &sigCfg)

	// Build compiled JSON output
	compiled := buildCompiledRule(rule.APIName, rule.DisplayName, rule.SourceObjectType, conditions, sigCfg)

	dhttp.WriteJSON(w, http.StatusOK, compiled)
}

// buildCompiledRule generates a compiled rule JSON from rule definition.
func buildCompiledRule(apiName, displayName, sourceObjectType string, conditions []RuleCondition, sigCfg SignalConfig) map[string]any {
	// Build SQL from conditions
	sql := buildRuleSQL(sourceObjectType, conditions)
	description := buildRuleDescription(displayName, conditions, sigCfg)
	severity := strings.ToLower(sigCfg.Severity)
	if severity == "" {
		severity = "medium"
	}

	result := map[string]any{
		"id":               apiName,
		"description":      description,
		"sql":              sql,
		"threshold":        0.5,
		"signalSeverity":   severity,
		"conditions":       conditions,
	}

	if sigCfg.TitleTemplate != "" {
		result["titleTemplate"] = sigCfg.TitleTemplate
	}

	return result
}

// buildRuleSQL generates a ClickHouse-compatible SQL query from rule conditions.
func buildRuleSQL(sourceObjectType string, conditions []RuleCondition) string {
	if len(conditions) == 0 {
		return fmt.Sprintf(
			"SELECT observation_id, asset_id, value FROM dataset_observations WHERE label = '%s_check' AND value > {threshold:Float64}",
			strings.ToLower(sourceObjectType),
		)
	}

	var clauses []string
	for _, c := range conditions {
		valStr := fmt.Sprintf("%v", c.Value)
		switch strings.ToLower(c.Op) {
		case "eq", "=":
			clauses = append(clauses, fmt.Sprintf("%s = '%s'", c.Field, valStr))
		case "neq", "!=":
			clauses = append(clauses, fmt.Sprintf("%s != '%s'", c.Field, valStr))
		case "gt", ">":
			clauses = append(clauses, fmt.Sprintf("%s > %s", c.Field, valStr))
		case "gte", ">=":
			clauses = append(clauses, fmt.Sprintf("%s >= %s", c.Field, valStr))
		case "lt", "<":
			clauses = append(clauses, fmt.Sprintf("%s < %s", c.Field, valStr))
		case "lte", "<=":
			clauses = append(clauses, fmt.Sprintf("%s <= %s", c.Field, valStr))
		case "contains":
			clauses = append(clauses, fmt.Sprintf("%s LIKE '%%%s%%'", c.Field, valStr))
		default:
			clauses = append(clauses, fmt.Sprintf("%s = '%s'", c.Field, valStr))
		}
	}

	joined := strings.Join(clauses, " AND ")
	return fmt.Sprintf(
		"SELECT observation_id, asset_id, value FROM dataset_observations WHERE %s AND value > {threshold:Float64}",
		joined,
	)
}

// buildRuleDescription creates a human-readable description for a rule.
func buildRuleDescription(displayName string, conditions []RuleCondition, sigCfg SignalConfig) string {
	if len(conditions) == 0 {
		return fmt.Sprintf("Rule %s: monitors %s for threshold breach", displayName, displayName)
	}

	var parts []string
	for _, c := range conditions {
		parts = append(parts, fmt.Sprintf("%s %s %v", c.Field, c.Op, c.Value))
	}
	return fmt.Sprintf("Rule %s: triggers when %s", displayName, strings.Join(parts, " AND "))
}
