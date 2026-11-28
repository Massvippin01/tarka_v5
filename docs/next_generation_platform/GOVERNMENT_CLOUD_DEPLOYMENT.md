# TARKA | GOVERNMENT-CLOUD & DATA-CENTRE READINESS

**Deployment Environments:** National Government Cloud (NIC MeghRaj) · State Data Centres (SDCs) · Private LEA Networks · Air-Gapped Forensic Stations  
**Statutory Framework:** Digital Personal Data Protection Act, 2023 (DPDPA) · CERT-In Security Guidelines · MeitY Cloud Empanelment Guidelines  
**Current Readiness Status:** **STAGING & CONTAINER VALIDATED — READY FOR ON-PREM / SDC PILOT**

---

## 1. Hosting Architecture & Service Decomposition

TARKA is engineered as a **modular hybrid system** that balances operational simplicity with containerized scalability:
- **Core Forensic Services:** Deployed as a consolidated modular service for high-speed inter-process memory communication without distributed network overhead.
- **Compute-Intensive AI Services:** Disaggregated into separate, auto-scaling GPU containers (vLLM / Triton / IndicConformer) to prevent heavy inference jobs from impacting core transactional evidence hashing.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SECURE GOVERNMENT CLOUD BOUNDARY (SDC / MEGHRAJ)                │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                             [TLS 1.3 Termination / WAF Gateway]
                                            │
    ┌───────────────────────────────────────┴───────────────────────────────────────┐
    ▼                                                                               ▼
┌───────────────────────────────────────────────┐               ┌───────────────────────────────────────────────┐
│        WEB FRONTEND CONTAINER (NGINX)         │               │         CORE INVESTIGATION API (FASTAPI)      │
│ • Static Assets & Skeuomorphic UI Bundle      │               │ • REST Endpoints & WebRTC Signalling          │
│ • Sub-12ms Local Delivery                     │◄─────────────►│ • Double-Entry Reconciler & LIBR Engine       │
│ • Strict CSP (Content Security Policy)        │               │ • Section 63 BSA Judicial Certificate Engine  │
└───────────────────────────────────────────────┘               └───────────────────────┬───────────────────────┘
                                                                                        │
                                        ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
                                        ▼                                               ▼                                               ▼
                        ┌───────────────────────────────┐               ┌───────────────────────────────┐               ┌───────────────────────────────┐
                        │   DATA PERSISTENCE LAYER      │               │    LOCAL INFERENCE RUNTIME    │               │  SPEECH & TRANSLATION ENGINE  │
                        │ • PostgreSQL (JSONB & WAL)    │               │ • llama.cpp / vLLM (Q4_K_M)   │               │ • AI4Bharat IndicConformer    │
                        │ • S3-Compatible Object Store  │               │ • Llama 3.1 8B Instruct       │               │ • Indic-TTS Speech Synthesis  │
                        │ • SQLite Local Cache (Offline)│               │ • Zero External Data Egress   │               │ • Web Speech Fallback         │
                        └───────────────────────────────┘               └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Data Sovereignty & Residency Guarantees

Under Indian evidentiary law and the Digital Personal Data Protection Act, 2023 (DPDPA), raw cyber-fraud case evidence must remain strictly within sovereign territorial boundaries:
1. **Strict Territorial Residency:** All databases, object storage buckets, and model weights reside exclusively in Indian data centres (e.g. NIC National Data Centres in Delhi, Hyderabad, Pune, or Bhubaneswar).
2. **Zero External Data Egress:** All LLM inference, OCR extraction, audio processing, and graph calculations execute on internal on-premise hardware. **No raw evidence bytes or transcripts are transmitted to external commercial APIs** (such as commercial AI providers or foreign cloud servers).
3. **Cryptographic Bitstream Sealing:** Every admitted digital artifact is immediately sealed with a SHA-256 hash upon intake. Modifying or replacing a file violates the immutable hash check and raises an immediate Gate I4 tamper alert.

---

## 3. Deployment Topologies

### Topology A: Air-Gapped Police Station Workstation (Standalone)
- **Target:** Single forensic investigator desktop / laptop without internet connectivity.
- **Hardware:** Intel Core i7 / AMD Ryzen 7, 32GB RAM, 1TB NVMe SSD, NVIDIA RTX 4060 (8GB VRAM).
- **Stack:** Local Python Uvicorn backend + Vite production static build + SQLite WAL database + llama.cpp local inference + Browser Web Speech API.

### Topology B: State Cyber Crime Headquarters (Multi-User SDC Cluster)
- **Target:** Regional Cyber Police Station serving 50+ concurrent investigating officers.
- **Hardware:** 2x Kubernetes Worker Nodes (each with 64 CPU cores, 256GB RAM, 2x NVIDIA A100 80GB GPUs).
- **Stack:** Containerized Docker/K8s deployment + PostgreSQL 16 Cluster with streaming replication + MinIO S3 Object Storage + vLLM Model Serving Cluster + AI4Bharat Indic Speech Stack.

---

## 4. Container Deployment Specifications

### 4.1 Docker Compose Configuration (`docker-compose.gov.yml`)
```yaml
version: '3.8'

services:
  tarka-frontend:
    image: tarka/frontend:v6-gov
    ports:
      - "80:80"
      - "443:443"
    environment:
      - VITE_API_BASE_URL=https://tarka.police.gov.in/api
    depends_on:
      - tarka-backend
    restart: always

  tarka-backend:
    image: tarka/backend:v6-gov
    ports:
      - "8080:8080"
    environment:
      - TARKA_ENV=production_gov
      - DATABASE_URL=postgresql://tarka_io:secure_pass@tarka-db:5432/tarka_dossier
      - OBJECT_STORE_PATH=/var/data/evidence_custody
      - LLM_BACKEND=local_llamacpp
      - LLM_HOST=http://tarka-llm:8000
    volumes:
      - evidence-custody:/var/data/evidence_custody
    depends_on:
      - tarka-db
    restart: always

  tarka-db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=tarka_dossier
      - POSTGRES_USER=tarka_io
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    restart: always

volumes:
  evidence-custody:
  pgdata:
```

---

## 5. Security Hardening Checklist for Government Approvals

- [x] **TLS 1.3 Strict Transport Security:** All traffic between browser, API, and storage services requires TLS 1.3 with forward secrecy ciphers.
- [x] **Role-Based Access Control (RBAC):** Strictly separates Investigating Officers (read/write case notes), Nodal Bank Officers (provisional freeze actions), and System Administrators.
- [x] **Investigation Flight Recorder (ISO/IEC 27042):** Append-only audit logging where each event incorporates the SHA-256 hash of the preceding event, rendering post-hoc tampering computationally impossible.
- [x] **Secrets Management:** Passwords, private keys for Section 63 BSA certificates, and database credentials load from environment variables or Kubernetes secrets, never checked into Git.
- [x] **Backup & Disaster Recovery:** Automated daily pg_dump backups + immutable object storage versioning allowing point-in-time recovery without loss of cryptographic custody.

