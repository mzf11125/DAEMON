package authn

import "errors"

// Session is a minimal credential carrier for Go services (collect-sensing, etc.).
// It is not a signed token: callers must populate SubjectID/TenantID/Roles only after
// gateway-side auth (API key, OIDC JWT, or trusted mesh header) has already validated identity.

type Session struct {
	SubjectID string
	TenantID  string
	Roles     []string
}

func ValidateSession(s Session) error {
	if s.SubjectID == "" {
		return errors.New("subject required")
	}
	if s.TenantID == "" {
		return errors.New("tenant required")
	}
	return nil
}
