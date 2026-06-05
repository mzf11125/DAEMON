use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Effect {
    Allow,
    Deny,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyDecision {
    pub effect: Effect,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct PolicySubject {
    #[serde(rename = "subjectId")]
    pub subject_id: Option<String>,
    #[serde(rename = "tenantId")]
    pub tenant_id: Option<String>,
    pub roles: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ResourceScope {
    #[serde(rename = "tenantId")]
    pub tenant_id: Option<String>,
    #[serde(rename = "domainId")]
    pub domain_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PolicyCheckRequest {
    pub action: String,
    pub resource: String,
    #[serde(default)]
    pub subject: Option<PolicySubject>,
    #[serde(default, rename = "resource_scope")]
    pub resource_scope: Option<ResourceScope>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PolicyRule {
    pub action: String,
    pub resource: String,
    pub effect: Effect,
}

#[derive(Debug, Clone, Default)]
pub struct PolicyEngine {
    rules: Vec<PolicyRule>,
}

impl PolicyEngine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn load_yaml(yaml: &str) -> Result<Self, PolicyError> {
        let rules: Vec<PolicyRule> = serde_yaml::from_str(yaml).map_err(PolicyError::Yaml)?;
        Ok(Self { rules })
    }

    pub fn evaluate(&self, action: &str, resource: &str) -> PolicyDecision {
        self.evaluate_request(&PolicyCheckRequest {
            action: action.into(),
            resource: resource.into(),
            subject: None,
            resource_scope: None,
        })
    }

    pub fn evaluate_request(&self, req: &PolicyCheckRequest) -> PolicyDecision {
        if let Some(decision) = self.cross_tenant_check(req) {
            return decision;
        }
        for rule in &self.rules {
            if rule.action == req.action && rule.resource == req.resource {
                return PolicyDecision {
                    effect: rule.effect.clone(),
                    reason: Some(format!(
                        "matched rule {}:{}",
                        req.action, req.resource
                    )),
                };
            }
        }
        PolicyDecision {
            effect: Effect::Deny,
            reason: Some("no matching rule".into()),
        }
    }

    fn cross_tenant_check(&self, req: &PolicyCheckRequest) -> Option<PolicyDecision> {
        let subject = req.subject.as_ref()?;
        let scope = req.resource_scope.as_ref()?;
        let principal_tenant = subject.tenant_id.as_deref()?;
        let resource_tenant = scope.tenant_id.as_deref()?;
        if principal_tenant == resource_tenant {
            return None;
        }
        let roles = subject.roles.as_deref().unwrap_or(&[]);
        let bypass = roles.iter().any(|r| r == "platform-admin" || r == "admin");
        if bypass {
            return None;
        }
        Some(PolicyDecision {
            effect: Effect::Deny,
            reason: Some("cross-tenant-denied".into()),
        })
    }
}

#[derive(Error, Debug)]
pub enum PolicyError {
    #[error("yaml: {0}")]
    Yaml(#[from] serde_yaml::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_matching_rule() {
        let yaml = r#"
- action: read
  resource: entity
  effect: allow
"#;
        let engine = PolicyEngine::load_yaml(yaml).unwrap();
        let d = engine.evaluate("read", "entity");
        assert_eq!(d.effect, Effect::Allow);
    }

    #[test]
    fn denies_unknown() {
        let engine = PolicyEngine::new();
        let d = engine.evaluate("write", "entity");
        assert_eq!(d.effect, Effect::Deny);
    }

    #[test]
    fn denies_cross_tenant_without_bypass_role() {
        let yaml = r#"
- action: read
  resource: entity
  effect: allow
"#;
        let engine = PolicyEngine::load_yaml(yaml).unwrap();
        let d = engine.evaluate_request(&PolicyCheckRequest {
            action: "read".into(),
            resource: "entity".into(),
            subject: Some(PolicySubject {
                subject_id: Some("u1".into()),
                tenant_id: Some("inst-alpha".into()),
                roles: Some(vec!["viewer".into()]),
            }),
            resource_scope: Some(ResourceScope {
                tenant_id: Some("ent-beta".into()),
                domain_id: Some("foundation".into()),
            }),
        });
        assert_eq!(d.effect, Effect::Deny);
    }
}
