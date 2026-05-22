package testutil

import (
	"os"
	"strings"
)

// ServiceEnv returns os.Environ() with keys in overrides replaced (last wins for subprocesses).
func ServiceEnv(overrides ...string) []string {
	strip := map[string]bool{
		"DATABASE_URL=":   true,
		"CLICKHOUSE_DSN=": true,
		"HTTP_PORT=":      true,
		"REPO_ROOT=":      true,
		"OIDC_REQUIRED=":  true,
		"RULES_ROOT=":     true,
		"NEO4J_URI=":      true,
	}
	out := make([]string, 0, len(os.Environ())+len(overrides))
	for _, e := range os.Environ() {
		skip := false
		for prefix := range strip {
			if strings.HasPrefix(e, prefix) {
				skip = true
				break
			}
		}
		if !skip {
			out = append(out, e)
		}
	}
	return append(out, overrides...)
}
