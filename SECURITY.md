# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a vulnerability

Report security issues privately to **security@daemon.ai** (or your organization's security contact if this fork is internal).

Please include:

- Affected component (gateway, collect-sensing, policy engine, etc.)
- Steps to reproduce
- Impact assessment (confidentiality, integrity, availability)
- Any suggested fix or mitigation

We aim to acknowledge reports within **3 business days** and provide a severity assessment within **10 business days**. Critical issues affecting tenant isolation or authentication may receive expedited patches.

Do not open public GitHub issues for undisclosed vulnerabilities.

## Secure deployment

See [docs/04-deployment.md](docs/04-deployment.md) for production environment requirements (API keys, webhook HMAC, policy engine URL, OIDC settings).
