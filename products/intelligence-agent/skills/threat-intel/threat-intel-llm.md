# Threat Intelligence LLM Architecture

Defensive CTI pipeline reference for Daemon Ontology intelligence agents.

## Scope and ethics

- Use **only authorized** sources: threat feeds, ISACs, vendor APIs, government advisories, internal telemetry.
- Commercial dark-web monitoring **contracts** — not unauthorized network probing.
- Refuse intrusion, credential theft, or law evasion requests.

## Architecture

### 1. Data acquisition

- OSINT feeds, CVE databases, malware reports, blockchain abuse lists, breach notification services.

### 2. Processing and normalization

- Deduplication, timestamp normalization, entity extraction (IPs, domains, hashes, wallet addresses).
- Map to canonical model (STIX-like fields) for ontology ingest.

### 3. Analysis engine

- LLMs: categorize threats, summarize reports, cluster TTPs, draft analyst notes.
- Always **human review** for high-impact decisions.
- Combine with rules engines and composite risk scoring.

### 4. Integration

- SOC tooling: SIEM, ticketing, SOAR with audit trails.
- Daemon Ontology: ingest as ppatk-osint / ppatk-netintel entities with ECDSA provenance.

## Legal and compliance

- GDPR, CCPA retention limits.
- PPATK STR workflows separate from raw CTI unless counsel-approved.
- Chain-of-custody via SMT provenance on all intelligence artifacts.
