# TARKA — Configuration Reference & Dependency Matrix

This document provides an exhaustive, verified specification of all environment variables, configuration parameters, and service dependencies for the **TARKA** digital forensics and evidence-analysis platform.

---

## 1. Environment Variables Specification

TARKA loads configuration from `.env` located at the workspace root or `backend/.env`.

| Variable Name | Required? | Component | Purpose & Verification | Safe Default / Fallback | Behavior When Missing |
|---|---|---|---|---|---|
| `APP_ENV` | Optional | Core Runtime | Operating environment tier (`development`, `staging`, `production`, `test`). | `development` | Defaults to local development mode with permissive CORS and debug logs. |
| `DEBUG` | Optional | FastAPI Core | Verbose application traceback and OpenAPI schema generation. | `true` in dev | Debug logging disabled in production. |
| `SECRET_KEY` | **Required (Prod)** | AuthService | High-entropy key (>=32 chars) for cryptographic JWT signing and statutory report sealing. | Dev placeholder key | Refuses startup in `production` tier. |
| `ALLOWED_ORIGINS` | Optional | FastAPI CORS | Comma-delimited list of permitted CORS frontend URLs. | `http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173` | Blocks external cross-origin browser requests. |
| **`SARVAM_API_KEY`** | **Optional (Voice)** | SarvamVoiceService | Sarvam AI Cloud subscription key for neural Indic speech-to-text (Saaras) and text-to-speech (Bulbul). | Empty / unconfigured | **Truthful fail-closed fallback**: Displays clear text responses, sets diagnostic to `UNCONFIGURED`, and keeps robotic browser speech synthesis disabled. |
| `SARVAM_API_BASE_URL` | Optional | SarvamVoiceService | Official REST endpoint for Sarvam AI speech models. | `https://api.sarvam.ai` | Falls back to default official API gateway. |
| `SARVAM_STT_MODEL` | Optional | SarvamVoiceService | Speech-to-Text foundation model identifier. | `saaras:v4` | Defaults to verified v4 Indic acoustic model. |
| `SARVAM_TTS_MODEL` | Optional | SarvamVoiceService | Neural Text-to-Speech synthesis model identifier. | `bulbul:v4-flash` | Defaults to verified v4 Flash low-latency engine. |
| `SARVAM_DEFAULT_SPEAKER`| Optional | SarvamVoiceService | Default voice persona identifier from the official v4 catalog. | `shubh_enhi_ads` | Automatically maps aliases (e.g. `priya` -> `simran_enhi_companion`). |
| `DATABASE_URL` | Optional | PostgreSQL Authority | Relational transactional database connection string. | `postgresql://sentinelx_user:...@localhost:5432/sentinelx` | Falls back to SQLite / in-memory transactional store for standalone dev. |
| `NEO4J_URI` | Optional | Knowledge Graph | Neo4j Bolt connection protocol URI. | `bolt://localhost:7687` | Traversal falls back to in-memory network projection if unreachable. |
| `NEO4J_USERNAME` | Optional | Knowledge Graph | Neo4j database user identifier. | `neo4j` | Used only when Neo4j container is running. |
| `NEO4J_PASSWORD` | Optional | Knowledge Graph | Neo4j database password. | `sentinelx_dev_secret` | Used only when Neo4j container is running. |
| `STORAGE_BACKEND` | Optional | Evidence Gateway | Content-addressed storage engine (`filesystem` or `s3`). | `filesystem` | Stores SHA-256 CAS blobs in local `data/storage/artifacts`. |
| `S3_ENDPOINT_URL` | Optional | MinIO / S3 Vault | Object storage endpoint URL for raw evidence bitstream preservation. | `http://localhost:9000` | Active only when `STORAGE_BACKEND=s3`. |
| `S3_ACCESS_KEY` | Optional | MinIO / S3 Vault | Object storage access credential. | `sentinelx_minio` | Active only when `STORAGE_BACKEND=s3`. |
| `S3_SECRET_KEY` | Optional | MinIO / S3 Vault | Object storage secret credential. | `sentinelx_dev_secret` | Active only when `STORAGE_BACKEND=s3`. |
| `S3_BUCKET_NAME` | Optional | MinIO / S3 Vault | Target S3 bucket name. | `sentinelx-evidence` | Active only when `STORAGE_BACKEND=s3`. |
| `OPA_URL` | Optional | Policy Gateway | Open Policy Agent HTTP service endpoint for formal statutory authorization. | `http://localhost:8181` | Evaluates local fallback policies if OPA is offline. |
| `OPA_FAIL_CLOSED` | Optional | Policy Gateway | Enforce fail-closed security when authorization cannot be established. | `true` | Refuses consequential actions if policy engine fails. |
| `REDIS_URL` | Optional | Cache / Ephemeral | In-memory cache for ambient voice turn-taking and session state. | `redis://localhost:6379/0` | Falls back to thread-safe in-memory dictionary. |
| `RUN_LIVE_SARVAM_TEST` | **Test Only** | Test Runner | Enables live provider calls during pytest (`RUN_LIVE_SARVAM_TEST=1`). | Empty / `0` | Live test skips cleanly to prevent accidental credit consumption. |

---

## 2. Architectural Invariants & Data Authority

1. **Transactional Authority**: PostgreSQL is transactional authority. In native developer mode, an embedded relational layer provides zero-dependency execution.
2. **Graph Projection**: Neo4j serves as a graph query and link-analysis projection. All graph data is rebuildable from canonical CAS evidence and custody records.
3. **Evidence Content-Addressed Storage (CAS)**:
   - Evidence is immutable and append-only.
   - SHA-256 cryptographic digests identify artifacts.
   - Bitstream preservation is guaranteed.
4. **Formal Logic Verification**:
   - Contradictions are detected using the deterministic Z3 SMT solver (`z3-solver`).
   - Guilt is never inferred by proximity or clustering.
   - Contradictions remain explicit and unmerged.
5. **Conversational Speech Invariant**:
   - Sarvam AI Bulbul is the sole audible voice synthesizer.
   - Robotic browser speech (`window.speechSynthesis`) is permanently disabled.
   - Unconfigured keys fail closed gracefully with text-only forensic rationale.

---

## 3. Feature & Dependency Matrix

| Subsystem | Implementation Status | Dependency Tier | Fallback / Degraded Behavior |
|---|---|---|---|
| **Conversational Assistant** | **IMPLEMENTED & VERIFIED** | Sarvam AI (Optional) | Full text rationale, Z3 explanations, and citation links rendered text-only if API key is unconfigured. |
| **Z3 SMT Contradiction Engine** | **IMPLEMENTED & VERIFIED** | Native Python (`z3-solver`) | Fully local, deterministic, and self-contained. No external API required. |
| **Section 63 BSA Report Generator** | **IMPLEMENTED & VERIFIED** | Native Python (`reportlab`) | Generates signed, tamper-evident PDF statutory certificates locally. |
| **Evidence Custody Ledger** | **IMPLEMENTED & VERIFIED** | Local SQLite / CAS Filesystem | Cryptographic SHA-256 Merkle-linked custody chain stored locally in `data/cases/<case_id>/custody.db`. |
| **Ambient Voice State Machine** | **IMPLEMENTED & VERIFIED** | Web Audio API + VAD | Ephemeral ring buffer with Voice Activity Detection and acoustic echo cancellation. |
| **Knowledge Graph Traversal** | **IMPLEMENTED & VERIFIED** | Neo4j (Optional) / Memory | In-memory graph projection enables interactive 2D/3D explorer even when Neo4j is offline. |
| **Statutory Policy Gateway** | **IMPLEMENTED & VERIFIED** | OPA (Optional) / Python | Local policy rules enforce RBAC and confirmation gates when external OPA is absent. |
| **Search Projection** | **PARTIALLY IMPLEMENTED** | OpenSearch (Optional) | Falls back to in-memory keyword filter over case artifacts. |

---

## 4. Port Allocations & Network Routing

When running via Docker Compose or native development, the following ports are used:

| Port | Service | Protocol | Access Boundary |
|---|---|---|---|
| `5173` | Frontend Dev Server (Vite) | HTTP | Localhost (`http://127.0.0.1:5173`) |
| `8000` | Backend API Server (FastAPI / Uvicorn) | HTTP | Localhost (`http://127.0.0.1:8000`) |
| `5432` | PostgreSQL Database | TCP | Internal / Localhost (`docker-compose.dev.yml`) |
| `7474` / `7687` | Neo4j Browser & Bolt | HTTP / Bolt | Localhost (`docker-compose.dev.yml`) |
| `9000` / `9001` | MinIO S3 API & Web Console | HTTP | Localhost (`docker-compose.dev.yml`) |
| `9200` | OpenSearch REST API | HTTP | Internal / Localhost (`docker-compose.dev.yml`) |
| `8181` | Open Policy Agent | HTTP | Internal / Localhost (`docker-compose.dev.yml`) |
| `6379` | Redis In-Memory Cache | TCP | Internal / Localhost (`docker-compose.dev.yml`) |
