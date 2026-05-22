package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ActionTypeDef mirrors ontology/v2/action-types/*.json.
type ActionTypeDef struct {
	APIName       string   `json:"apiName"`
	RequiredRoles []string `json:"requiredRoles"`
}

// AuthorizeAction checks JWT roles against action type requiredRoles.
func AuthorizeAction(ctx context.Context, ontologyRoot, actionType string) error {
	def, err := loadActionType(ontologyRoot, actionType)
	if err != nil {
		return err
	}
	if len(def.RequiredRoles) == 0 {
		return nil
	}
	for _, need := range def.RequiredRoles {
		if HasRole(ctx, need) {
			return nil
		}
	}
	return fmt.Errorf("missing required role for %s", actionType)
}

func loadActionType(root, actionType string) (ActionTypeDef, error) {
	p := filepath.Join(root, "action-types", actionType+".json")
	b, err := os.ReadFile(p)
	if err != nil {
		return ActionTypeDef{}, fmt.Errorf("action type %s: %w", actionType, err)
	}
	var def ActionTypeDef
	if err := json.Unmarshal(b, &def); err != nil {
		return ActionTypeDef{}, err
	}
	if def.APIName == "" {
		def.APIName = actionType
	}
	return def, nil
}

// AnyRole returns true if user has one of the roles (case-sensitive).
func AnyRole(ctx context.Context, roles ...string) bool {
	for _, r := range roles {
		if HasRole(ctx, strings.TrimSpace(r)) {
			return true
		}
	}
	return false
}
