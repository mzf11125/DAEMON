#!/usr/bin/env bash
# Apply or print GitHub branch ruleset for main (repo admins). See docs/governance/github-rulesets-v1.md.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-}"
if [ -z "$REPO" ]; then
  if command -v gh >/dev/null 2>&1; then
    REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  fi
fi
if [ -z "$REPO" ]; then
  echo "apply-github-ruleset: set GITHUB_REPOSITORY or run from a gh-authenticated clone" >&2
  exit 1
fi

OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

# Ruleset payload: PR required + required checks (names must match CI job names).
PAYLOAD=$(cat <<'JSON'
{
  "name": "main-production-gates",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "exclude": [],
      "include": ["refs/heads/main"]
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "validate", "integration_id": null },
          { "context": "integration", "integration_id": null },
          { "context": "aip-eval", "integration_id": null },
          { "context": "policy", "integration_id": null }
        ]
      }
    },
    {
      "type": "non_fast_forward"
    }
  ]
}
JSON
)

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "apply-github-ruleset: DRY_RUN — payload for $REPO:"
  echo "$PAYLOAD" | python3 -m json.tool
  echo "Activate manually: Settings → Rules → Rulesets, or: gh api repos/$OWNER/$NAME/rulesets --method POST"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "apply-github-ruleset: install gh CLI and authenticate (gh auth login)" >&2
  exit 1
fi

echo "apply-github-ruleset: creating/updating ruleset on $REPO (requires admin)"
echo "$PAYLOAD" | gh api "repos/${OWNER}/${NAME}/rulesets" --method POST --input - 2>/dev/null \
  || echo "apply-github-ruleset: if ruleset exists, update in GitHub UI per docs/governance/github-rulesets-v1.md"
echo "apply-github-ruleset: done — verify required checks match latest green PR job names"
