# DAEMON — Parity Gap vs Palantir (Foundry · AIP · Apollo · Ontology)

**Tanggal:** 2026-06-05 (diperbarui) · **Commit:** `d7a76d1` · **Sumber:** `docs/19-product-parity-matrix.md`, `docs/15`/`14`/`18`, program ANTERO + Parity (`docs/private/DAEMON_sebagai_Pondasi_ANTERO.md`)
**Lensa:** Skunk Works (arsitektur) · DHL (operasi multi-domain) · HedgeFund (kelayakan klaim). Zero-failure, no false-positive.

---

## Posisi jujur hari ini (bukan klaim "100%")

Program parity internal DAEMON **secara eksplisit menargetkan ~65–75% weighted parity**, bukan 100%, dan repo sendiri mencatat baseline awal **~15–25% permukaan komersial Palantir** (Foundry ~20–30%, AIP ~15–25%, Apollo ~0–10%), dengan core control-plane ~40–55% (`palantir_e2e_parity` plan). Kelima fase program (DC, DI, Ontology, AIP, Apollo) sudah berstatus `completed`, jadi DAEMON kini berada di sekitar target tersebut — **mendekati 65–75% pada matrix yang ia definisikan sendiri**, jauh dari 100% Palantir.

**Penting (anti-false-positive):** "100% mirip Palantir" tidak realistis sebagai target karena program ini secara sadar menetapkan **non-goals permanen** (lihat §6). Yang masuk akal: tutup gap kapabilitas di bawah untuk mencapai **paritas fungsional multi-sektor**, bukan kompatibilitas API Palantir.

---

## 1. FOUNDRY — Data Connection & Integration

### Sudah Live
File/HTTP/Postgres/S3/Kafka/NATS/JDBC-CDC connector, webhook & listener ingress, agent-worker push, ingest scheduler (cron), StreamPipeline hooks, bronze lakehouse, lakehouse export, media objects, job observability (`docs/19`).

### Gap yang BELUM dibangun

| # | Kapabilitas Palantir | Status DAEMON | Yang perlu dibangun |
|---|---|---|---|
| F1 | **Pipeline Builder** (DAG point-and-click, preview, codegen) | Hanya `pipelines` product + `POST /v1/pipelines/:id/run`; **tanpa visual authoring/preview** (`docs/18`) | Visual DAG editor + transform preview + backend codegen. Saat ini YAML + kode normalizer manual. |
| F2 | **Open table format (Iceberg)** penuh | Hanya **Postgres bronze + JSONL export + Iceberg metadata sidecar (MVP)** (`docs/18` MMDP) | Catalog Iceberg sungguhan (snapshot, time-travel, schema evolution), bukan sidecar. |
| F3 | **Virtual tables / virtual catalog** | Hanya gold SQL views | Lapisan katalog virtual lintas-sumber. |
| F4 | **Streaming compute (Flink-class)** | Event-driven propagation in-process; **no stream product** (`docs/18`) | Engine streaming sungguhan (windowing, stateful stream jobs). |
| F5 | **Bring-your-own compute / Compute Modules** | Extension via connector; **no compute module product** | Runtime modul komputasi yang dapat di-deploy pengguna. |
| F6 | **Marketplace connectors (24+ source types)** | Hanya tipe yang punya factory + test | Packaging katalog connector + marketplace. (Disengaja dibatasi anti-slop.) |
| F7 | **Private Link / VPC endpoints** | Deferred (`docs/15`) | Endpoint privat enterprise, agent installer/proxy, WebSocket sync channel long-lived. |
| F8 | **OIDC untuk connector eksternal** | Deferred (`docs/15`) | Auth OIDC pada koneksi sumber. |
| F9 | **Metrics/log export pipeline** | Query API saja; no log-export pipeline (`docs/18`) | Pipeline ekspor metrik/log ke dataset. |

---

## 2. ONTOLOGY (Object layer + OSDK)

### Sudah Live
Read by id, list entities (paginated), write + journal, logic on write path, hybrid search, Workshop-lite read-only UI, pack base + extension, Neo4j graph sync (opsional), NL→Cypher (`ontology-query`).

### Gap yang BELUM dibangun

| # | Kapabilitas Palantir | Status DAEMON | Yang perlu dibangun |
|---|---|---|---|
| O1 | **OSDK** (TypeScript/Python generated, OAuth) | Hanya `@daemon/sdk` HTTP client + pack codegen; **no OSDK OAuth** (non-goal) | Generated typed SDK ber-OAuth dari ontology, app React hosted. |
| O2 | **Action Types** kelas-Palantir (parameterized actions, side-effects, validations) | **Partial @ `d7a76d1`:** `configs/governance/action-types.yaml` (`tp-routing-decision`, `tp-price-simulation`) + `action-type-guard.ts` pada write path; belum side-effect orchestration penuh Palantir | Perluas Action Types ke O4 Functions + side-effects terkelola. |
| O3 | **Object Views / Object Explorer** penuh | Workshop-lite read-only | Explorer interaktif objek+link. |
| O4 | **Functions on Objects** (TS/Python user-defined, sandboxed) | `callable functions` registry dasar | Runtime fungsi user-defined tersandbox, ber-versi. |
| O5 | **Time-series / geotemporal property types** | — | Tipe properti deret-waktu & geospasial native. |

---

## 3. AIP (AI plane)

### Sudah Live
Customer GPT, agent sessions API, callable functions, evals persist (Postgres), admin status, logic engine (TS + Rust URL opsional), `aip-evals` product, retrieval context (hybrid search + lakehouse citations).

### Gap yang BELUM dibangun

| # | Kapabilitas Palantir | Status DAEMON | Yang perlu dibangun |
|---|---|---|---|
| A1 | **AIP Logic** (visual block builder) | Partial via ontology-query + automations; **no visual blocks** (`docs/18`) | Editor blok logika visual. |
| A2 | **AIP Assist** (in-IDE copilot) | — (pakai IDE eksternal) | Copilot terintegrasi platform. |
| A3 | **Chatbot Studio** (low-code agent composer) | `customer-gpt` (kode), bukan studio | Composer agent low-code. |
| A4 | **Hosted LLM model catalog** | Env OpenRouter; bukan katalog hosted (`docs/18`) | Katalog model + governance model. |
| A5 | **Agent tool-use governance/guardrails di hot path** | `prompt-guard`/`action-guard` ada tapi sebagian belum terpasang penuh | Guardrail agent wajib pada setiap tool call. |

---

## 4. APOLLO (Ops / delivery plane)

### Sudah Live
Pack validate-change, pack promote, ops health/jobs/connectors API, Helm chart (gateway/ingest/agent-worker), staging smoke, compose dev/prod, K8s manifests, Terraform skeleton.

### Gap yang BELUM dibangun

| # | Kapabilitas Palantir | Status DAEMON | Yang perlu dibangun |
|---|---|---|---|
| P1 | **Zero-downtime continuous delivery** (Apollo inti) | Helm + pack promote dev→staging→prod; **belum** orkestrasi upgrade zero-downtime lintas-konstelasi | Release orchestrator (canary, rollback otomatis, dependency-aware upgrade). |
| P2 | **Environment constellation management** | Single deploy + tenancy | Manajemen banyak environment/instance terkelola pusat. |
| P3 | **Automated release notes / changelog tie-in** | Manual | Otomasi release notes per versi pack + migrasi. |
| P4 | **Apollo-style policy/approval gates lintas-env** | `validate-change` gate dasar | Gate persetujuan & promotion policy formal. |

---

## 5. Multi-sektor & multi-domain — sudah kuat, tinggal diperluas

**Kabar baik:** arsitektur multi-domain **sudah terbukti jalan**. Ada 3 pack: `foundation`, `logistics-commercial`, `aml-compliance` (`configs/ontology/packs/`), plus pack-branching resolver dan tenancy (`X-Daemon-Tenant`/domain). Ini fondasi multi-sektor yang nyata.

### Gap untuk benar-benar multi-sektor skala enterprise

| # | Gap | Yang perlu dibangun |
|---|---|---|
| M1 | **Library pack per sektor** (healthcare, gov/defense, manufacturing, energy, finance markets) | Tambah extension pack per vertikal — pola sudah ada, tinggal otori taksonomi. |
| M2 | **Isolasi tenant yang benar** | **Gate 0 substantially closed @ `d7a76d1`:** `resolveBound`, `TenantScopeGuard`, `@Protected` routes, RBAC YAML di local authorizer; tes `gateway-security`, `isolation` (ABC tenants). Residual: ABAC/RLS belum hot path. (lihat `DAEMON_Security_Audit.md` Lampiran) |
| M3 | **Pack governance lifecycle** (versioning, deprecation, cross-pack dependency) | Manajemen siklus hidup pack lintas-domain. |
| M4 | **Per-domain policy bundles** | **Partial (logistics ABC):** peran `logistics-viewer`, `commercial-analyst`, `logistics-editor`, `abc-platform-admin` di `rbac.yaml`; HIPAA/ITAR bundles tetap Tier 2. |

---

## 6. Non-goals permanen (mengapa "100% Palantir" bukan target)

Repo menetapkan ini **di luar lingkup secara sengaja** — mengejarnya berarti melawan desain:
- Palantir cloud APIs, **OSDK OAuth**, **Workshop/Contour/Quiver/Fusion UI penuh**, marketplace connector packaging, private-link enterprise SKU.
- Kompatibilitas API/OSDK Foundry (DAEMON adalah *mimic stack*, bukan klien Palantir).
- Klaim persentase tanpa bukti baris matrix.

**Implikasi:** target realistis = **paritas kapabilitas fungsional ~85–90%** untuk use-case multi-sektor, bukan "100% mirip Palantir". Klaim 100% pada artefak apa pun akan menjadi false-positive yang berisiko saat due-diligence.

---

## 7. Roadmap prioritas (untuk paritas multi-sektor maksimal)

**Gate 0 — Prasyarat:** ✅ **Substantially closed** `@d7a76d1` (C1–C4 mitigated; `pnpm run test:repo` hijau). Residual H1/H2/H3 wajib sebelum exposure produksi eksternal penuh.

**Program ANTERO (Fase 1 shadow, read-only):** Lihat `DAEMON_sebagai_Pondasi_ANTERO.md` — tenancy ABC, ingest fixture, `antero-shadow-parity` CI, Shadow Pricing read-only, OBL stub.

**Tier 1 — Nilai tertinggi, effort sedang:**
- O2 Action Types formal — **partial** (TP/RoutingDecision); lanjut O4 Functions on Objects.
- F2 Iceberg penuh + F4 streaming (inti data plane modern) — **belum**; Shadow Pricing memakai ClickHouse + ontology read path.
- M1 pack per-sektor — `logistics-commercial` = sector pack ABC hari ini; M4 partial via rbac logistics.

**Tier 2 — Skala enterprise:**
- P1 zero-downtime CD + P2 constellation management (Apollo sejati).
- A1 AIP Logic visual + A3 Chatbot Studio (UX AIP).
- O1 OSDK typed+OAuth (jika keluar dari non-goal).

**Tier 3 — Permukaan/UX:**
- F1 Pipeline Builder visual, O3 Object Explorer, F6 marketplace connectors.

---

## Verdict

DAEMON **bukan** 0% dan **bukan** 100% — ia di ~65–75% weighted pada matrix-nya sendiri, dengan **fondasi multi-domain yang sudah terbukti** (3 pack, tenancy, propagasi). **Gate 0 keamanan substantially closed** memungkinkan Fase 1 shadow multi-tenant (ABC program). Gap terbesar yang tersisa: **data plane modern** (Iceberg/streaming), **ontology authoring penuh** (O2/O4, OSDK), **AIP UX**, **Apollo sejati** — sengaja di luar scope program ANTERO Tier 1.

*Catatan: status "completed" pada plan internal berarti fase ter-ship, bukan paritas 100%. Semua gap di atas dikutip dari dokumen gap milik repo sendiri (`Not implemented`, `Deferred`, `Planned`, MMDP).*
