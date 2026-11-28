# TARKA | PRODUCTION DEPLOYMENT & SOVEREIGN OPERATIONS
## Air-Gapped Topology, Government-Cloud Readiness, and High Availability

**Deployment Target:** State Cyber Crime Police Stations, Special Cells, and State Data Centres (SDC)  
**Security Standard:** MeitY Cloud Security Mandates, ISO/IEC 27001, CERT-In Guidelines  

---

## 1. Physical & Logical Deployment Topology

TARKA is engineered for zero-trust, air-gapped on-premises data centers or MeitY-empaneled sovereign government clouds:

```
┌────────────────────────────────────────────────────────────────────────┐
│               AIR-GAPPED STATE DATA CENTRE (SDC) ZONE                 │
│                                                                        │
│  ┌───────────────────────┐             ┌─────────────────────────────┐ │
│  │   NGINX TLS TERMINATION│             │      UVICORN FASTAPI        │ │
│  │   (Mutual TLS / WAF)  │ ──────────► │  (Port 8080 / 4 Workers)    │ │
│  └───────────────────────┘             └──────────────┬──────────────┘ │
│                                                       │                │
│             ┌─────────────────────────────────────────┼──────────────┐ │
│             ▼                                         ▼              ▼ │
│  ┌─────────────────────┐               ┌────────────────┐ ┌──────────┐ │
│  │  CANONICAL POSTGRES │               │  NEO4J GRAPH   │ │ S3 WORM  │ │
│  │ (Evidence Custody,  │               │  PROJECTION    │ │ EVIDENCE │ │
│  │  Audit, Case State) │               │ (Syndicate DB) │ │ STORAGE  │ │
│  └─────────────────────┘               └────────────────┘ └──────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Readiness, Liveness, and Health Probes

TARKA exposes standard Kubernetes/systemd health probes:

- **Liveness Probe**: `GET /api/v1/system/health/liveness`
  Returns HTTP 200 if the Python event loop and worker process are responsive.
- **Readiness Probe**: `GET /api/v1/system/health/readiness`
  Validates database connectivity, cryptographic signing key availability, and evidence vault mount writability.
- **System Capacity Probe**: `GET /api/v1/ingestion/system-capacity`
  Reports real-time RAM headroom, active worker count, and admission threshold status.

---

## 3. Backup, Disaster Recovery & Storage Migration

1. **Deterministic Recovery**:
   All graph projections, search indexes, and analytical summaries are derived artifacts. If the graph database or search index is corrupted, running `POST /api/v1/cases/{case_id}/rebuild-projections` fully reconstructs the entire state directly from the canonical PostgreSQL and immutable evidence vault.
2. **Database Migrations**:
   Managed exclusively via declarative, non-destructive migration scripts. Schema rollbacks preserve existing audit records.
3. **Audit Trail Sealing**:
   The flight recorder audit ledger writes append-only SHA-256 hash chains. Every officer action is timestamped and cryptographically linked to the previous log entry.

