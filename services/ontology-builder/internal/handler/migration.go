package handler

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MigrationSQL represents a generated DDL statement.
type MigrationSQL struct {
	Statement string `json:"statement"`
	Reason    string `json:"reason"`
	TableName string `json:"tableName"`
}

// GenerateMigrations compares the current workspace with the last published version
// and generates SQL DDL statements for new/changed object types.
func GenerateMigrations(pool *pgxpool.Pool, workspaceID string) ([]MigrationSQL, error) {
	var sql []MigrationSQL

	// Get the current manifest from workspace
	rawManifest := buildManifest(pool, nil, workspaceID)
	if rawManifest == nil {
		return nil, fmt.Errorf("workspace has no data")
	}

	// Get last published snapshot
	typeRow := pool.QueryRow(context.Background(),
		`SELECT snapshot FROM ontology_versions
		 WHERE workspace_id = $1 AND published = true
		 ORDER BY version DESC LIMIT 1`, workspaceID,
	)
	var prevSnapshot []byte
	if err := typeRow.Scan(&prevSnapshot); err != nil {
		// No previous published version — all objects are new
		prevSnapshot = nil
	}

	// Parse current objects
	currentObjs := getObjectDefs(rawManifest)

	// Parse previous objects
	var prevObjs []objectDef
	if prevSnapshot != nil {
		// Try to extract from snapshot
	}

	// Generate CREATE TABLE for new object types
	if prevSnapshot == nil {
		// First publish — CREATE TABLE for all objects
		for _, obj := range currentObjs {
			sql = append(sql, generateCreateTable(obj))
		}
	} else {
		// Incremental: compare current vs previous
		currentNames := make(map[string]bool)
		for _, obj := range currentObjs {
			currentNames[obj.apiName] = true
		}

		prevNames := make(map[string]bool)
		for _, obj := range prevObjs {
			prevNames[obj.apiName] = true
		}

		// New objects
		for _, obj := range currentObjs {
			if !prevNames[obj.apiName] {
				sql = append(sql, generateCreateTable(obj))
			}
		}

		// Changed objects: check for new columns
		for _, cur := range currentObjs {
			for _, prev := range prevObjs {
				if cur.apiName != prev.apiName {
					continue
				}

				prevCols := make(map[string]propertyDef)
				for _, p := range prev.properties {
					prevCols[p.name] = p
				}

				for _, p := range cur.properties {
					if _, exists := prevCols[p.name]; !exists {
						sql = append(sql, MigrationSQL{
							Statement: fmt.Sprintf("ALTER TABLE ontology_objects ADD COLUMN %s %s;",
								p.name, sqlType(p.propType)),
							Reason:    fmt.Sprintf("New property '%s' added to %s", p.name, cur.apiName),
							TableName: cur.apiName,
						})
					}
				}
			}
		}
	}

	if len(sql) == 0 {
		sql = append(sql, MigrationSQL{
			Statement: "-- No schema changes detected",
			Reason:    "Workspace is up-to-date with last published version",
			TableName: "",
		})
	}

	return sql, nil
}

type objectDef struct {
	apiName    string
	properties []propertyDef
}

type propertyDef struct {
	name     string
	propType string
	required bool
}

func getObjectDefs(raw map[string]any) []objectDef {
	var defs []objectDef
	objs, _ := raw["objectTypes"].([]any)
	for _, o := range objs {
		objMap, _ := o.(map[string]any)
		apiName, _ := objMap["apiName"].(string)
		if apiName == "" {
			continue
		}
		od := objectDef{apiName: apiName}
		props, _ := objMap["properties"].([]any)
		for _, p := range props {
			propMap, _ := p.(map[string]any)
			name, _ := propMap["name"].(string)
			propType, _ := propMap["type"].(string)
			required, _ := propMap["required"].(bool)
			od.properties = append(od.properties, propertyDef{
				name: name, propType: propType, required: required,
			})
		}
		defs = append(defs, od)
	}
	return defs
}

func generateCreateTable(obj objectDef) MigrationSQL {
	var cols []string
	cols = append(cols, "id UUID PRIMARY KEY DEFAULT gen_random_uuid()")
	cols = append(cols, "tenant_id TEXT NOT NULL")

	for _, p := range obj.properties {
		notNull := ""
		if p.required {
			notNull = " NOT NULL"
		}
		cols = append(cols, fmt.Sprintf("%s %s%s", p.name, sqlType(p.propType), notNull))
	}

	cols = append(cols, "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
	cols = append(cols, "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")

	return MigrationSQL{
		Statement: fmt.Sprintf("CREATE TABLE %s (\n  %s\n);",
			sqlTableName(obj.apiName),
			strings.Join(cols, ",\n  ")),
		Reason:    fmt.Sprintf("New object type '%s'", obj.apiName),
		TableName: obj.apiName,
	}
}

func sqlType(t string) string {
	switch t {
	case "string":
		return "TEXT"
	case "number":
		return "DOUBLE PRECISION"
	case "boolean":
		return "BOOLEAN"
	case "date":
		return "DATE"
	case "timestamp":
		return "TIMESTAMPTZ"
	case "enum":
		return "TEXT"
	case "geo_point":
		return "GEOMETRY(POINT, 4326)"
	case "reference":
		return "TEXT"
	case "array":
		return "JSONB"
	case "json":
		return "JSONB"
	default:
		return "TEXT"
	}
}

func sqlTableName(apiName string) string {
	return "obj_" + strings.ToLower(strings.ReplaceAll(apiName, " ", "_"))
}
