package handler

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CompilerConfig holds paths for compiled output.
type CompilerConfig struct {
	OutputRoot string // e.g., /ontology/v2-compiled
}

// CompiledManifest is the output format written to disk.
type CompiledManifest struct {
	Version         string             `json:"version"`
	Domain          string             `json:"domain"`
	ObjectTypes     []CompiledObject   `json:"objectTypes"`
	ObjectTypeNames []string           `json:"objectTypeNames"`
	LinkTypes       []CompiledLink     `json:"linkTypes"`
	LinkTypeNames   []string           `json:"linkTypeNames"`
	ActionTypes     []CompiledAction   `json:"actionTypes"`
	ActionTypeNames []string           `json:"actionTypeNames"`
}

type CompiledObject struct {
	APIName       string             `json:"apiName"`
	DisplayName   string             `json:"displayName"`
	PrimaryKey    string             `json:"primaryKey"`
	TitleProperty string             `json:"titleProperty"`
	Description   string             `json:"description,omitempty"`
	Properties    []CompiledProperty `json:"properties"`
}

type CompiledProperty struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Required bool   `json:"required,omitempty"`
	// Extended type metadata
	Values           []string            `json:"values,omitempty"`
	TargetObjectType string              `json:"targetObjectType,omitempty"`
	Items            *CompiledArrayItems `json:"items,omitempty"`
}

type CompiledArrayItems struct {
	Type             string   `json:"type"`
	Values           []string `json:"values,omitempty"`
	TargetObjectType string   `json:"targetObjectType,omitempty"`
}

type CompiledLink struct {
	APIName      string `json:"apiName"`
	SourceType   string `json:"sourceType"`
	TargetType   string `json:"targetType"`
	Cardinality  string `json:"cardinality"`
}

type CompiledAction struct {
	APIName    string   `json:"apiName"`
	DisplayName string  `json:"displayName"`
	RequiredRoles []string `json:"requiredRoles"`
	Parameters []CompiledActionParam `json:"parameters"`
}

type CompiledActionParam struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

// CompileToDisk compiles a workspace and writes the result to disk.
// Returns the output path and the compiled manifest.
func CompileToDisk(pool *pgxpool.Pool, workspaceID, tenantID, outputRoot string) (string, *CompiledManifest, error) {
	// Build the full manifest from the workspace
	rawManifest := buildManifest(pool, nil, workspaceID)
	if rawManifest == nil {
		return "", nil, fmt.Errorf("workspace %s has no data", workspaceID)
	}

	// Convert to compiled format
	manifest := convertToCompiled(rawManifest)

	// Determine output path — per-tenant directory
	tenantDir := filepath.Join(outputRoot, "tenant-"+tenantID)
	if err := os.MkdirAll(tenantDir, 0755); err != nil {
		return "", nil, fmt.Errorf("mkdir %s: %w", tenantDir, err)
	}

	// Write object types
	objDir := filepath.Join(tenantDir, "object-types")
	os.MkdirAll(objDir, 0755)
	for _, obj := range manifest.ObjectTypes {
		b, _ := json.MarshalIndent(obj, "", "  ")
		os.WriteFile(filepath.Join(objDir, obj.APIName+".json"), b, 0644)
	}

	// Write link types
	linkDir := filepath.Join(tenantDir, "link-types")
	os.MkdirAll(linkDir, 0755)
	for _, link := range manifest.LinkTypes {
		b, _ := json.MarshalIndent(link, "", "  ")
		os.WriteFile(filepath.Join(linkDir, link.APIName+".json"), b, 0644)
	}

	// Write action types
	actDir := filepath.Join(tenantDir, "action-types")
	os.MkdirAll(actDir, 0755)
	for _, action := range manifest.ActionTypes {
		b, _ := json.MarshalIndent(action, "", "  ")
		os.WriteFile(filepath.Join(actDir, action.APIName+".json"), b, 0644)
	}

	// Write manifest.json
	manifestBytes, _ := json.MarshalIndent(manifest, "", "  ")
	manifestPath := filepath.Join(tenantDir, "manifest.json")
	if err := os.WriteFile(manifestPath, manifestBytes, 0644); err != nil {
		return "", nil, fmt.Errorf("write manifest: %w", err)
	}

	return tenantDir, manifest, nil
}

func convertToCompiled(raw map[string]any) *CompiledManifest {
	m := &CompiledManifest{
		Version: "2.0.0",
		Domain:  "custom",
	}

	// Objects
	if objs, ok := raw["objectTypes"].([]any); ok {
		for _, o := range objs {
			objMap, _ := o.(map[string]any)
			obj := compileObject(objMap)
			m.ObjectTypes = append(m.ObjectTypes, obj)
			m.ObjectTypeNames = append(m.ObjectTypeNames, obj.APIName)
		}
	}

	// Links
	if links, ok := raw["linkTypes"].([]any); ok {
		for _, l := range links {
			linkMap, _ := l.(map[string]any)
			lk := compileLink(linkMap)
			m.LinkTypes = append(m.LinkTypes, lk)
			m.LinkTypeNames = append(m.LinkTypeNames, lk.APIName)
		}
	}

	// Actions
	if acts, ok := raw["actionTypes"].([]any); ok {
		for _, a := range acts {
			actMap, _ := a.(map[string]any)
			ac := compileAction(actMap)
			m.ActionTypes = append(m.ActionTypes, ac)
			m.ActionTypeNames = append(m.ActionTypeNames, ac.APIName)
		}
	}

	return m
}

func compileObject(obj map[string]any) CompiledObject {
	o := CompiledObject{
		APIName:       strVal(obj, "apiName"),
		DisplayName:   strVal(obj, "displayName"),
		PrimaryKey:    strVal(obj, "primaryKey"),
		TitleProperty: strVal(obj, "titleProperty"),
		Description:   strVal(obj, "description"),
		Properties:    []CompiledProperty{},
	}

	if props, ok := obj["properties"].([]any); ok {
		for _, p := range props {
			propMap, _ := p.(map[string]any)
			prop := CompiledProperty{
				ID:       strVal(propMap, "name"),
				Type:     strVal(propMap, "type"),
				Required: boolVal(propMap, "required"),
			}

			// Handle type-specific config
			if cfg, ok := propMap["config"].(map[string]any); ok {
				if vals, ok := cfg["values"].([]any); ok {
					for _, v := range vals {
						prop.Values = append(prop.Values, fmt.Sprint(v))
					}
				}
				if target, ok := cfg["targetObjectType"].(string); ok {
					prop.TargetObjectType = target
				}
				if items, ok := cfg["items"].(map[string]any); ok {
					prop.Items = &CompiledArrayItems{
						Type:             strVal(items, "type"),
						TargetObjectType: strVal(items, "targetObjectType"),
					}
					if itemVals, ok := items["values"].([]any); ok {
						for _, v := range itemVals {
							prop.Items.Values = append(prop.Items.Values, fmt.Sprint(v))
						}
					}
				}
			}

			o.Properties = append(o.Properties, prop)
		}
	}

	return o
}

func compileLink(link map[string]any) CompiledLink {
	card := strVal(link, "cardinality")
	// Map from DB format (MANY_TO_ONE) to v2 format (many-to-one)
	cardMap := map[string]string{
		"ONE_TO_ONE":   "one-to-one",
		"ONE_TO_MANY":  "one-to-many",
		"MANY_TO_ONE":  "many-to-one",
		"MANY_TO_MANY": "many-to-many",
	}
	if mapped, ok := cardMap[card]; ok {
		card = mapped
	}

	return CompiledLink{
		APIName:    strVal(link, "apiName"),
		SourceType: strVal(link, "fromObjectType"),
		TargetType: strVal(link, "toObjectType"),
		Cardinality: card,
	}
}

func compileAction(act map[string]any) CompiledAction {
	return CompiledAction{
		APIName:       strVal(act, "apiName"),
		DisplayName:   strVal(act, "displayName"),
		RequiredRoles: []string{"analyst"}, // default
		Parameters:    []CompiledActionParam{},
	}
}

func strVal(m map[string]any, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func boolVal(m map[string]any, key string) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return false
}
