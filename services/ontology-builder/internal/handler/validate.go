package handler

import (
	"encoding/json"
	"net/http"

	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ValidateWorkspace validates a workspace's ontology for consistency.
func ValidateWorkspace(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID := chi.URLParam(r, "workspaceId")
		var errors []map[string]any
		var warnings []map[string]any

		// Check objects exist
		var objCount int
		pool.QueryRow(r.Context(),
			`SELECT COUNT(*) FROM ontology_object_types WHERE workspace_id = $1`, workspaceID,
		).Scan(&objCount)
		if objCount == 0 {
			warnings = append(warnings, map[string]any{
				"path":    "objects",
				"message": "No object types defined — workspace is empty",
			})
		}

		// Check all link references resolve to actual object types
		linkRows, _ := pool.Query(r.Context(),
			`SELECT api_name, from_object_type, to_object_type
			 FROM ontology_link_types WHERE workspace_id = $1`, workspaceID,
		)
		if linkRows != nil {
			defer linkRows.Close()
			for linkRows.Next() {
				var apiName, from, to string
				linkRows.Scan(&apiName, &from, &to)

				var exists int
				pool.QueryRow(r.Context(),
					`SELECT COUNT(*) FROM ontology_object_types WHERE workspace_id = $1 AND api_name = $2`,
					workspaceID, from,
				).Scan(&exists)
				if exists == 0 {
					errors = append(errors, map[string]any{
						"path":    "links." + apiName,
						"message": "fromObjectType '" + from + "' does not exist in this workspace",
					})
				}

				pool.QueryRow(r.Context(),
					`SELECT COUNT(*) FROM ontology_object_types WHERE workspace_id = $1 AND api_name = $2`,
					workspaceID, to,
				).Scan(&exists)
				if exists == 0 {
					errors = append(errors, map[string]any{
						"path":    "links." + apiName,
						"message": "toObjectType '" + to + "' does not exist in this workspace",
					})
				}
			}
		}

		// Check all action targetObjectTypes exist
		actRows, _ := pool.Query(r.Context(),
			`SELECT api_name, target_object_type
			 FROM ontology_action_types WHERE workspace_id = $1`, workspaceID,
		)
		if actRows != nil {
			defer actRows.Close()
			for actRows.Next() {
				var apiName, target string
				actRows.Scan(&apiName, &target)

				var exists int
				pool.QueryRow(r.Context(),
					`SELECT COUNT(*) FROM ontology_object_types WHERE workspace_id = $1 AND api_name = $2`,
					workspaceID, target,
				).Scan(&exists)
				if exists == 0 {
					errors = append(errors, map[string]any{
						"path":    "actions." + apiName,
						"message": "targetObjectType '" + target + "' does not exist in this workspace",
					})
				}
			}
		}

		// Check for duplicate apiNames across types
		dupRows, _ := pool.Query(r.Context(),
			`SELECT api_name, COUNT(*) FROM ontology_object_types WHERE workspace_id = $1 GROUP BY api_name HAVING COUNT(*) > 1`,
			workspaceID,
		)
		if dupRows != nil {
			defer dupRows.Close()
			for dupRows.Next() {
				var name string
				var count int
				dupRows.Scan(&name, &count)
				errors = append(errors, map[string]any{
					"path":    "objects." + name,
					"message": "Duplicate object type apiName '" + name + "'",
				})
			}
		}

		valid := len(errors) == 0
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"valid":      valid,
			"errors":     errors,
			"warnings":   warnings,
			"objectCount":     objCount,
		})
	}
}

// CompilePreview generates a preview manifest from the workspace.
func CompilePreview(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID := chi.URLParam(r, "workspaceId")
		manifest := buildManifest(pool, r, workspaceID)
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"compiledManifest": manifest,
			"workspaceId":      workspaceID,
		})
	}
}

// CompileWorkspace compiles the workspace into a version snapshot.
func CompileWorkspace(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID := chi.URLParam(r, "workspaceId")
		var req struct {
			ChangeSummary string `json:"changeSummary"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		manifest := buildManifest(pool, r, workspaceID)
		snapshot, _ := json.Marshal(manifest)

		// Get next version number
		var maxVersion int
		pool.QueryRow(r.Context(),
			`SELECT COALESCE(MAX(version), 0) FROM ontology_versions WHERE workspace_id = $1`,
			workspaceID,
		).Scan(&maxVersion)
		version := maxVersion + 1

		// Insert version snapshot
		pool.Exec(r.Context(),
			`INSERT INTO ontology_versions (workspace_id, version, snapshot, change_summary, published, created_at)
			 VALUES ($1, $2, $3, $4, false, NOW())`,
			workspaceID, version, snapshot, req.ChangeSummary,
		)

		// Update workspace updated_at
		pool.Exec(r.Context(),
			`UPDATE ontology_workspaces SET updated_at = NOW() WHERE id = $1`, workspaceID,
		)

		dhttp.WriteJSON(w, http.StatusOK, map[string]any{
			"version":       version,
			"changeSummary": req.ChangeSummary,
			"objectCount":   len(objectTypeNames(manifest))},
		)
	}
}

func buildManifest(pool *pgxpool.Pool, r *http.Request, workspaceID string) map[string]any {
	manifest := map[string]any{
		"version":     "workspace-draft",
		"workspaceId": workspaceID,
	}

	// Collect object types
	objRows, _ := pool.Query(r.Context(),
		`SELECT api_name, display_name, primary_key, title_property, description
		 FROM ontology_object_types WHERE workspace_id = $1 ORDER BY sort_order, api_name`, workspaceID,
	)
	if objRows != nil {
		objectTypes := []map[string]any{}
		var objectNames []string
		defer objRows.Close()
		for objRows.Next() {
			var apiName, displayName, pk, titleProp, desc string
			objRows.Scan(&apiName, &displayName, &pk, &titleProp, &desc)
			objectNames = append(objectNames, apiName)

			obj := map[string]any{
				"apiName":       apiName,
				"displayName":   displayName,
				"primaryKey":    pk,
				"titleProperty": titleProp,
			}
			if desc != "" {
				obj["description"] = desc
			}

			// Load properties
			propRows, _ := pool.Query(r.Context(),
				`SELECT name, type, required, config FROM ontology_properties
				 WHERE object_type_id IN (SELECT id FROM ontology_object_types WHERE api_name = $1 AND workspace_id = $2)
				 ORDER BY sort_order, name`, apiName, workspaceID,
			)
			if propRows != nil {
				var properties []map[string]any
				defer propRows.Close()
				for propRows.Next() {
					var pName, pType string
					var required bool
					var configBytes []byte
					propRows.Scan(&pName, &pType, &required, &configBytes)
					prop := map[string]any{
						"name":     pName,
						"type":     pType,
						"required": required,
					}
					if len(configBytes) > 2 { // not just "{}"
						var cfg map[string]any
						json.Unmarshal(configBytes, &cfg)
						prop["config"] = cfg
					}
					properties = append(properties, prop)
				}
				obj["properties"] = properties
			}
			objectTypes = append(objectTypes, obj)
		}
		manifest["objectTypes"] = objectTypes
		manifest["objectTypeNames"] = objectNames
	}

	// Collect link types
	linkRows, _ := pool.Query(r.Context(),
		`SELECT api_name, from_object_type, to_object_type, cardinality
		 FROM ontology_link_types WHERE workspace_id = $1 ORDER BY api_name`, workspaceID,
	)
	if linkRows != nil {
		var linkTypes []map[string]any
		defer linkRows.Close()
		for linkRows.Next() {
			var apiName, from, to, card string
			linkRows.Scan(&apiName, &from, &to, &card)
			linkTypes = append(linkTypes, map[string]any{
				"apiName":        apiName,
				"fromObjectType": from,
				"toObjectType":   to,
				"cardinality":    card,
			})
		}
		manifest["linkTypes"] = linkTypes
	}

	// Collect action types
	actRows, _ := pool.Query(r.Context(),
		`SELECT api_name, display_name, target_object_type, requires_approval
		 FROM ontology_action_types WHERE workspace_id = $1 ORDER BY api_name`, workspaceID,
	)
	if actRows != nil {
		var actionTypes []map[string]any
		defer actRows.Close()
		for actRows.Next() {
			var apiName, displayName, target string
			var reqApproval bool
			actRows.Scan(&apiName, &displayName, &target, &reqApproval)
			actionTypes = append(actionTypes, map[string]any{
				"apiName":          apiName,
				"displayName":      displayName,
				"targetObjectType": target,
				"requiresApproval": reqApproval,
			})
		}
		manifest["actionTypes"] = actionTypes
	}

	return manifest
}

func objectTypeNames(manifest map[string]any) []string {
	if ots, ok := manifest["objectTypeNames"].([]string); ok {
		return ots
	}
	return nil
}
