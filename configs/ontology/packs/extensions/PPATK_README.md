# PPATK / INTRAC extension packs

Six ontology extension packs that compose the DAEMON deployment surface for
**PPATK (Pusat Pelaporan dan Analisis Transaksi Keuangan) / INTRAC**.

Legal basis: UU 8/2010 (TPPU), UU 9/2013 (TPPT), UU P2SK 2023, PerKa PPATK
(incl. PerKa PPATK 8/2023 for VASP), FATF Recommendations, Egmont Group
Principles for Information Exchange.

All packs extend `foundation` (`Party`, `Organization`, `Case`, `Event`,
`Link`, `Document`). They are loaded selectively per tenant via
`configs/ontology/domains/catalog.yaml`.

| Pack | Purpose | Entity count | Junction count |
|------|---------|--------------|----------------|
| `ppatk-aml` | STR/CTR/CBCC reports, accounts, transactions, sanctions, disclosures | 10 | 5 |
| `ppatk-crypto` | Wallets, on-chain transactions, VASPs, bridges, contracts, tokens | 6 | 6 |
| `ppatk-labels` | Cross-domain labels, operational flags, provenance | 3 | 3 |
| `ppatk-darkweb` | Marketplaces, vendors, listings, onion services, PGP keys | 5 | 5 |
| `ppatk-osint` | Personas, corporate registries, leaks, mentions, geo | 5 | 6 |
| `ppatk-netintel` | IPs, domains, certs, ASNs, malware, threat actors, campaigns | 7 | 7 |

## Tenant composition

- **PPATK (full)** — load all six packs.
- **PJK pelapor (bank/PVA/fintech/VASP)** — load `ppatk-aml` only. Intel
  layers are out of scope by Pasal 41 kerahasiaan.
- **APH (Polri/Kejagung/KPK) consumer** — load `ppatk-aml` + `ppatk-labels`
  read-only via `Disclosure` flow.

## Governance hooks

- Propagation rules added in `configs/governance/propagation.yaml`
  (typology-rule-engine, sanctions-screen, taint-recompute,
  dual-control-approval, chain-of-custody-sign, quarantine-scan).
- Role-gated actions in `configs/governance/action-catalog.yaml`
  (`ppatk.analyst`, `ppatk.crypto_analyst`, `ppatk.intel_analyst`,
  `ppatk.compliance_lead`, `ppatk.deputy_director`).
- Connector tiers in `configs/collect-sensing/connectors-catalog.yaml`
  (`internal`, `restricted`, `regulated`, `sensitive`).

## Next implementation steps

1. Wire goAML XML connector in `collect-sensing/connectors/`.
2. Implement structuring/smurfing typology rule in
   `read-write-loops/loop-controller/`.
3. Implement taint-propagation engine (Rust) in
   `security-governance/policy/` consumed by labels propagation.
4. Demo cross-domain fusion query in `products/ontology-query/` joining
   `MalwareSample` → `Wallet` → `OnChainTransaction` → `VASP` →
   `FinancialAccount` → `STRReport`.
