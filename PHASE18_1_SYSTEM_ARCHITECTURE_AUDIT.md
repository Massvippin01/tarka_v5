# TARKA × SENTINELX — PHASE 18.1: SYSTEM ARCHITECTURE AUDIT

**Date:** 2026-11-25  
**Platform Version:** 2.0.0 (Release: TARKA Forensic Intelligence & SentinelX Nexus)  
**Standard:** SentinelX Engineering Constitution (Waves 1–6)  
**Deliverable:** `PHASE18_1_SYSTEM_ARCHITECTURE_AUDIT.md`

---

## 1. System Overview & Core Responsibilities

TARKA × SENTINELX is a sovereign, deterministic digital evidence ingestion, tracing, and statutory investigation platform tailored for Indian Law Enforcement Agencies (LEAs). The system is partitioned into five primary functional layers:

1. **Evidence Ingestion & Bitstream Custody Layer:**
   - Universal Evidence Gateway (`UniversalEvidenceGateway`).
   - Append-only Content-Addressable Storage (CAS) with streaming SHA-256 calculation.
   - Offline CPU-optimized RapidOCR extraction engine (`RapidOCREngine`).
2. **Deterministic Forensic & Reconciliation Layer:**
   - TRACE Payment Forensics Engine (`TracePaymentForensics`): Implements Core Banking System (CBS) and NPCI UPI reconciliation.
   - Taint & Lien Engine: Implements the judicial Lowest Intermediate Balance Rule (LIBR), FIFO, and Pro-Rata taint propagation.
   - Z3 SMT Contradiction Prover: Isolates irreconcilable financial/temporal contradictions mathematically.
3. **Epistemic Safety & Governance Layer:**
   - AEGIS Epistemic Gateway: Enforces the non-guilt principle ("AI proposes, forensic engines test, evidence supports, investigators decide"). Prevents automated identity merges and exposes evidentiary uncertainty.
   - 7-Factor Role-Based Access Control (RBAC): Case-scoped tenancy and fail-closed authorization.
4. **Graph & Network Projection Layer:**
   - Neo4j / Local Unified Graph: Graph projection engine for conduit account clusters, device IMEI correlations, and Wi-Fi BSSID tethering.
   - Custom SVG Layout Engine (`NetworkSvg.tsx` / `GangSvg`): Pure geometric layout guaranteeing collision-free label pills, leader lines, and progressive layer expansion.
5. **Statutory Action & Court Dossier Layer:**
   - Statutory notice drafters for Sections 94, 106, 107 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.
   - Admissible Court Dossier generator with ReportLab binary PDF output certified under Section 63(4) of the Bharatiya Sakshya Adhiniyam (BSA), 2023.

---

## 2. Component & Dependency Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VITE + REACT 19 FRONTEND                        │
│ - V6 Tactile Skeuomorphic Shell (#F8F4ED, #E9E2D7, #221C19)            │
│ - 6-Stage Investigation Stepper (Intake → Ledger → Trail → Net → Stat) │
│ - ActionsReportScreen (Single 5-Col Summary, Ranked Directives Table)  │
│ - FraudNetworkScreen (Canvas Graph, Layered GangSvg, Waterfall)        │
│ - Third-Party Export Suite (i2 Analyst's Notebook, Maltego, STIX 2.1)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / SSE (/api/v1/*)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FASTAPI ASGI BACKEND (2.0.0)                     │
│ ├── Auth & Policy: AuthService (7-Factor RBAC, Fail-Closed Scope)      │
│ ├── Ingestion API: Resumable chunking, ProjectsStore, DerivedStore     │
│ ├── Case API: Canonical Case Lifecycle, Statutory Notices, Bundles     │
│ ├── Forensics API: TRACE Engine, AEGIS Gateway, ReportLab BSA PDF      │
│ ├── Graph API: Network Decisions, Account Verdicts, Exports            │
│ └── Voice API: Offline CPU ONNX + Sarvam Cloud Speech Engine           │
└───────┬───────────────────┬───────────────────┬───────────────────┬────┘
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  POSTGRESQL  │    │   NEO4J 5    │    │  MINIO / CAS │    │  OPENSEARCH  │
│ Transactional│    │ Graph Query  │    │ Append-Only  │    │   Derived    │
│  Authority   │    │  Projection  │    │ Evidence CAS │    │    Search    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 3. Data Flow & Boundary Analysis

1. **Intake Flow:** Raw files are streamed into `cas_data/` via chunked transfer. SHA-256 hashes are computed in-flight without loading whole files into server RAM.
2. **Deduplication Flow:** Ingested transactions pass through `derived_store.py`, where composite keys `(account, rrn, amount, timestamp)` eliminate duplicate transactions across overlapping uploads.
3. **Forensic Reconciliation Flow:** The TRACE engine compares victim CBS debits against NPCI switch STAN logs. Discrepancies are flagged as potential tampering or timing anomalies.
4. **Statutory Directives Flow:** The Taint engine isolates conduit accounts, calculates recovery percentages under LIBR, and ranks directives in `ActionsReportScreen`.
5. **Dossier Sealing Flow:** Evidence exhibits are assembled into a cryptographic Merkle root hash chain (`89c20491...`) and compiled into a PDF certificate under BSA Section 63(4).

---

## 4. Critical Path to Deployment

1. **Container Topology:** Zero-trust internal network (`sentinelx-prod-net`) with unprivileged NGINX reverse-proxy on port 80/8080.
2. **Reverse Proxy Configuration:** NGINX `proxy_read_timeout` and `proxy_buffering off` must be optimized for long-lived Server-Sent Events (SSE) and large chunked uploads.
3. **Graceful Storage Fallback:** Backend must seamlessly operate with persistent Docker volumes (`pg_prod_data`, `neo4j_prod_data`, `minio_prod_data`, `evidence_prod_data`) while retaining local in-memory/file fallback for isolated offline test environments.
