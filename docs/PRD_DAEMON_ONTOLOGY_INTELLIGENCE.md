# Product Requirements Document (PRD)
**Project Name:** Daemon Ontology Intelligence Platform (previously Daemon V2.1)
**Date:** June 6, 2026
**Status:** In Development (Implementation Phases 0-5 Completed)
**Primary Stakeholders:** Financial Intelligence Units (e.g., PPATK), Compliance Officers, Threat Intelligence Analysts

---

## 1. Executive Summary
Daemon Ontology Intelligence Platform adalah sistem data cerdas kelas *enterprise* yang dirancang untuk mengintegrasikan pengumpulan informasi OSINT (Open Source Intelligence), pemantauan jaringan Dark Web, dan pemrosesan Graph Database untuk mendeteksi tindak pidana pencucian uang (TPPU) dan pendanaan terorisme. Platform ini memadukan *LLM-driven Agentic Intelligence* dengan *Cryptographic Provenance* untuk menjamin bahwa seluruh bukti dan aliran data memenuhi standar hukum (UU No. 8 Tahun 2010 tentang PPATK).

## 2. Product Vision & Goals
**Vision:** Menjadi tulang punggung intelijen finansial yang proaktif, di mana agen AI dan analis manusia bekerja berdampingan dalam mengungkap jaringan kejahatan kerah putih melintasi Surface Web, Dark Web, dan transaksi *On-Chain*.

**Goals:**
1. Mengotomatisasi penemuan indikator risiko (*risk indicators*) dari OSINT dan Dark Web.
2. Mempercepat pembuatan laporan Suspicious Transaction Report (STR / LTMS) yang komprehensif.
3. Menjamin keaslian data intelijen sejak pertama kali dikumpulkan hingga pengadilan menggunakan Cryptographic Provenance (CSCP²).
4. Melacak pergerakan aset (Taint Propagation) secara rekursif melalui Neo4j dan Rust Logic Engine.

## 3. Target Personas
1. **Financial Investigator / Analis PPATK:** Membutuhkan visualisasi *graph* dan ringkasan transaksi untuk mengidentifikasi pola *Structuring* atau *Layering*.
2. **Cyber Threat Intel Analyst:** Membutuhkan akses ke *marketplace* dan forum di *Dark Web* untuk mencari jejak kebocoran data (PII) atau PGP Keys yang terkait dengan dompet kripto kriminal.
3. **Compliance Officer (Bank/Crypto Exchange):** Membutuhkan *Sanctions Screener* otomatis (DTTOT, OFAC) dan platform untuk mereview draf STR.

---

## 4. Features & Requirements

### 4.1. Core Intelligence Agent
*   **LLM Intelligence Orchestrator:** Sistem AI pusat yang mampu menggunakan *tools* (seperti pencarian YDC) dan merumuskan hipotesis.
*   **Graph Analyst Subagent:** Agen spesialis yang menavigasi *Neo4j Graph Database* untuk menemukan pola TPPU (contoh: *Circular, Hub-and-Spoke, Shell Chain*).
*   **STR Narrator Subagent:** Agen pembuat teks yang secara otomatis merangkum data kasus menjadi format draf Suspicious Transaction Report yang siap direview.
*   **Entity Resolver:** Fitur untuk menyatukan entitas duplikat menggunakan *fuzzy matching* (Jaro-Winkler) atau pencocokan eksak (NIK/NPWP/Crypto Wallet).

### 4.2. Data Collection & Monitoring
*   **OSINT Collector:** Integrasi dengan API You.com (YDC) untuk pencarian Surface Web tingkat dalam, riset konten, dan deteksi eksposur dompet kripto.
*   **Dark Web Monitor (Golang):**
    *   *SOCKS5 Tor Proxy Integration*: Rute jaringan terisolasi.
    *   *Marketplace & Forum Indexer*: *Crawler* khusus yang mengekstrak PGP Keys, Harga Listing, dan Vendor Profile dengan *authorization whitelist*.
*   **Sanctions Screener:** Pemindaian berkelanjutan (*continuous screening*) terhadap DTTOT (Daftar Terduga Teroris dan Organisasi Teroris), UN SC, dan OFAC.

### 4.3. Logic & Risk Engine
*   **Typology Rule Engine:** Penilaian risiko berlandaskan tipologi resmi PPATK.
*   **Taint Propagation (Rust):** *Logic engine* berbasis Rust dengan metode *FIFO/Poison/Haircut* untuk menandai dan melacak penyebaran "dana kotor" di jaringan.

### 4.4. Intelligence Dashboard (UI/UX)
*   **Intelligence Panel:** Antarmuka satu-pintu untuk memulai *OSINT Scan* atau pemantauan *Dark Web Surface*.
*   **Case Management:** Papan kerja (*Kanban/Table*) untuk melacak status investigasi, prioritas kasus, dan penugasan analis.
*   **STR Review Board:** Platform *Human-in-the-Loop* bagi analis senior untuk membaca, merevisi, menyetujui, atau menolak draf STR buatan AI.
*   **API Credit Monitor:** Visualisasi batas penggunaan API komersial (YDC), estimasi biaya per *query*, dan *hard limit enforcement*.

---

## 5. System Architecture & Tech Stack
*   **Frontend:** React 19, Vite, TypeScript (`apps/dsdk-console`).
*   **Backend / API:** Node.js, NestJS (`api/gateway`, `@daemon/api-rest`).
*   **Logic Engine & Processing:** Rust (Core Taint Propagation, Inference Engine).
*   **High-Risk Crawling:** Golang (`collect-sensing` module untuk Tor/Darkweb crawler yang cepat, terenkapsulasi, dan terisolasi).
*   **Database:** PostgreSQL (Authoritative Journaling & Case Management), Neo4j (Entity Relationship & Typology Projection), Redis (Caching & Job Queue).
*   **LLM Provider:** Integrasi You.com (YDC) dan model AI kustom via Daemons.

---

## 6. Security, Compliance, & Legal
1. **Cryptographic Provenance (CSCP²):** Setiap *node* data yang diekstrak akan di-hash menggunakan *Sparse Merkle Tree* (SMT) dan ditandatangani. Hal ini memastikan asal-usul data (*chain of custody*) tidak bisa dibantah (non-repudiation) di pengadilan.
2. **Dual-Control Authorization:** Aktivasi pencarian Dark Web memerlukan parameter `AuthorizedBy` dan `AuthorizationDate` (sesuai UU 8/2010 Pasal 44 tentang Intelijen Keuangan).
3. **Data Privacy:** Sistem dilengkapi *Role-Based Access Control* (RBAC) di mana data NIK atau nama dilindungi (*masked*) untuk personel tanpa otorisasi.

---

## 7. Success Metrics (KPIs)
*   **Operational Efficiency:** Pengurangan waktu analisis OSINT dari rata-rata 4 jam/entitas menjadi kurang dari 5 menit menggunakan YDC OSINT Agent.
*   **STR Accuracy:** >85% draf STR yang dihasilkan AI diterima (di-*approve*) oleh analis senior dengan modifikasi teks kurang dari 15%.
*   **Detection Rate:** Kemampuan mendeteksi anomali Graph (*Structuring/Layering*) dalam hitungan detik untuk dataset dengan >1 juta node.
*   **Credit Efficiency:** Cost per investigation tidak melebihi $0.20 per *case* pada YDC API.

---

## 8. Future Roadmap (Phase 6+)
1. **Visual Link Analysis (VLA):** Penambahan *widget* graf dinamis di UI yang bisa di-*drag-and-drop* layaknya IBM i2 Analyst's Notebook.
2. **Crypto On-Chain Enrichment:** Integrasi dengan *node* Bitcoin/Ethereum penuh untuk *tracing* lapisan kedua tanpa pihak ketiga.
3. **Automated Subpoena Generation:** Menghasilkan draf surat permintaan data (Subpoena) secara otomatis jika ada *blank spot* dalam graf perbankan.

---
*Documented by Daemon Architect Agent.*
