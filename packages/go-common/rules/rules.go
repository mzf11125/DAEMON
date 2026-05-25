package rules

import (
	"fmt"
	"regexp"
	"strings"
)

const maxSQLLength = 16_384

var (
	placeholderRe              = regexp.MustCompile(`\{threshold:Float64\}`)
	tenantPlaceholderRe        = regexp.MustCompile(`\{tenant:String\}`)
	tableRewriteRe             = regexp.MustCompile(`(?i)\bFROM\s+dataset_observations\b`)
	featureLabelRewriteRe      = regexp.MustCompile(`(?i)\bFROM\s+features_label_daily\b`)
	propensityScoresTableRe    = regexp.MustCompile(`(?i)\bpropensity_model_scores\b`)
	tenantIDRe                 = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$`)
)

// RuleDef matches ontology/v2/rules/*.json.
type RuleDef struct {
	ID               string  `json:"id"`
	Description      string  `json:"description"`
	SQL              string  `json:"sql"`
	Threshold        float64 `json:"threshold"`
	SignalSeverity   string  `json:"signalSeverity"`
	ScoreKind        string  `json:"scoreKind,omitempty"`
	ConfidenceMethod string  `json:"confidenceMethod,omitempty"`
}

// ValidateTenantID rejects tenant IDs that would break SQL string interpolation.
func ValidateTenantID(tenantID string) error {
	if tenantID == "" {
		return nil
	}
	if !tenantIDRe.MatchString(tenantID) {
		return fmt.Errorf("invalid tenant id %q", tenantID)
	}
	return nil
}

// RenderSQL substitutes placeholders, normalizes table names, and scopes by tenant when set.
func RenderSQL(rule RuleDef, tenantID string) (string, error) {
	if strings.TrimSpace(rule.SQL) == "" {
		return "", fmt.Errorf("rule %s: sql is required", rule.ID)
	}
	if err := ValidateTenantID(tenantID); err != nil {
		return "", err
	}
	q := placeholderRe.ReplaceAllString(rule.SQL, fmt.Sprintf("%g", rule.Threshold))
	q = tableRewriteRe.ReplaceAllString(q, "FROM daemon.dataset_observations")
	q = featureLabelRewriteRe.ReplaceAllString(q, "FROM daemon.features_label_daily")
	q = propensityScoresTableRe.ReplaceAllString(q, "daemon.propensity_model_scores")
	if tenantID != "" {
		escaped := strings.ReplaceAll(tenantID, "'", "''")
		if strings.Contains(rule.SQL, "{tenant:String}") {
			q = tenantPlaceholderRe.ReplaceAllString(q, fmt.Sprintf("'%s'", escaped))
		} else {
			q = appendTenantFilter(q, tenantID)
		}
	}
	return q, nil
}

func appendTenantFilter(q, tenantID string) string {
	escaped := strings.ReplaceAll(tenantID, "'", "''")
	clause := fmt.Sprintf("tenant_id = '%s'", escaped)
	upper := strings.ToUpper(q)
	if strings.Contains(upper, " WHERE ") {
		return q + " AND " + clause
	}
	return q + " WHERE " + clause
}

// ValidateSQL ensures the query is a single read-only SELECT.
func ValidateSQL(q string) error {
	s := strings.TrimSpace(q)
	if s == "" {
		return fmt.Errorf("empty sql")
	}
	if len(s) > maxSQLLength {
		return fmt.Errorf("sql exceeds max length %d", maxSQLLength)
	}
	if strings.Contains(s, ";") {
		return fmt.Errorf("multiple statements not allowed")
	}
	if strings.Contains(s, "--") || strings.Contains(s, "/*") {
		return fmt.Errorf("sql comments not allowed")
	}
	upper := strings.ToUpper(s)
	if !strings.HasPrefix(upper, "SELECT") {
		return fmt.Errorf("only SELECT queries allowed")
	}
	deny := []string{
		"INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "CREATE ",
		"TRUNCATE ", "GRANT ", "REVOKE ", "ATTACH ", "DETACH ", "SYSTEM ",
		"KILL ", "OPTIMIZE ", "EXPLAIN ",
	}
	for _, kw := range deny {
		if strings.Contains(upper, kw) {
			return fmt.Errorf("forbidden keyword in sql: %s", strings.TrimSpace(kw))
		}
	}
	return nil
}

// ValidateRuleFile checks rule JSON fields used at ontology validate time.
func ValidateRuleFile(rule RuleDef) error {
	if rule.ID == "" {
		return fmt.Errorf("rule id is required")
	}
	if strings.TrimSpace(rule.SQL) == "" {
		return fmt.Errorf("rule %s: sql is required", rule.ID)
	}
	if !strings.Contains(rule.SQL, "{threshold:Float64}") {
		return fmt.Errorf("rule %s: sql must contain {threshold:Float64}", rule.ID)
	}
	rendered, err := RenderSQL(rule, "")
	if err != nil {
		return err
	}
	return ValidateSQL(rendered)
}
