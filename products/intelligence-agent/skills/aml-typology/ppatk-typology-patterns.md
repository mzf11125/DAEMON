# PPATK AML Typology Patterns

Indonesian APU-PPT typology reference for Daemon Ontology rule engines and intelligence agents.

## Structuring (Penyertaan)

- Breaking large transactions into smaller amounts below reporting thresholds.
- Indicators: multiple near-threshold transfers within 24h, high frequency (>12 tx/window), round amounts.
- Detection: `high_frequency_transfers`, `near_threshold_pct >= 0.92` of large-value limit.
- PPATK relevance: indicative of attempt to avoid LTKM/STR reporting obligations.

## Layering (Pelapisan)

- Moving funds through multiple accounts or jurisdictions to obscure origin.
- Indicators: rapid transit (inflow followed by ≥85% outflow within 30 minutes), chain of unrelated counterparties.
- Detection: transit address templates, multi-hop interaction risk (2-hop label propagation).
- Combine with entity resolution to merge alias accounts.

## Trade-Based Money Laundering (TBML)

- Over/under-invoicing, phantom shipping, misclassified goods to transfer value across borders.
- Indicators: invoice amount vs market price divergence, shell company in OSS/AHU with no operational footprint.
- OSINT: YDC queries on `site:ahu.go.id`, corporate registry, adverse media (korupsi, penipuan).

## Ransomware

- Crypto payments to known ransomware clusters; mixing service interaction post-payment.
- Indicators: `ransomware` risk label, wallet taint from sanctioned/mixing neighbors.
- OSINT: wallet address search `(scam OR hack OR ransomware OR sanctioned)`.
- Dark web: clearnet mentions of victim leaks via YDC `darkwebSignals` template.

## Rule engine integration

- Typology hits feed `CompositeRiskEngine` transaction and taint dimensions.
- High-confidence typology + sanctions hit → escalate to STR narrative generation.
