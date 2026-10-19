# TARKA | INDIGENOUS DIGITAL FORENSICS PLATFORM
## Operational Setup & Verification Guide

This manual documents the verified startup process, environment configuration, external dependency states, and testing procedures for the TARKA Indigenous Digital Forensics Platform (operating under the SUTRAM 2026 Framework and SIH 2026 PS 26189 benchmark).

---

### 1. Architectural Architecture & Verified Stack

- **Frontend**: React 18 + Vite + TypeScript with TailwindCSS utility foundation and custom dark graphite tokens (`tokens.css`).
  - Default Interface: `TarkaForensicWorkstation.tsx` (accessible at `http://127.0.0.1:5173`).
  - Legacy Canvas View: Available via query param `http://127.0.0.1:5173/?view=canvas`.
- **Backend**: FastAPI 0.111+ on Python 3.12 (Uvicorn ASGI runner on `http://127.0.0.1:8000`).
- **Forensic Engine**: Pure-Python TARKA Core + Z3 SMT Theorem Prover v5.1.0 (offline deterministic contradiction detection & MUS extraction).
- **Storage**: Dual-tier Content-Addressed Storage (CAS) with S3/MinIO driver and resilient local filesystem CAS fallback (`data/storage/artifacts/`).
- **Speech & Natural Language**: Sarvam AI Indian Speech Models (Saaras STT `saaras:v4` + Bulbul TTS `bulbul:v4-flash`) with automatic browser SpeechSynthesis / typed fallback.

---

### 2. Environment Configuration

The backend configuration is managed by Pydantic Settings in `backend/app/core/config.py`. Configuration is read from environment variables or a local `.env` file in `c:\PROJECTS\SentinelX\`.

#### Mandatory Core Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | Operating tier: `development`, `staging`, `production`, `test` |
| `SECRET_KEY` | `sentinelx_development_secret...` | 32+ character HMAC-SHA256 signing secret for session tokens |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | CORS allowed origins for frontend communication |
| `DATABASE_URL` | `sqlite+aiosqlite:///./sentinelx.db` | Primary transactional store (SQLite async or PostgreSQL) |

#### Sarvam AI Voice Configuration

| Variable | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `SARVAM_API_KEY` | **Optional** (Manual) | `""` (Empty) | Sarvam AI API subscription key obtained from https://dashboard.sarvam.ai |
| `SARVAM_API_BASE_URL` | No | `https://api.sarvam.ai` | Base URL for Sarvam REST endpoints |
| `SARVAM_STT_MODEL` | No | `saaras:v4` | Recommended speech-to-text model identifier |
| `SARVAM_TTS_MODEL` | No | `bulbul:v4-flash` | Recommended text-to-speech model identifier |
| `SARVAM_DEFAULT_SPEAKER` | No | `shubh_enhi_ads` | Default speaker persona for `bulbul:v4-flash` |

> [!IMPORTANT]
> **API Key Safety & Data Boundary**:
> `SARVAM_API_KEY` is loaded exclusively server-side. It is NEVER exposed to browser bundles or logged.
> Zero raw evidence files, unhashed bytes, or bulk case data are ever transmitted to Sarvam or any external cloud service.
> When `SARVAM_API_KEY` is not set, the platform operates in `OFFLINE_LOCAL_FALLBACK` mode using local browser speech synthesis and typed command inputs.

---

### 3. Quick Start (Development & Local Demonstration)

#### Prerequisites
- Windows 10/11 64-bit or Linux (Ubuntu 22.04+)
- Python 3.11 or 3.12 (64-bit)
- Node.js 18.x or 20.x + npm

#### Step 1: Start Backend API Server
From `c:\PROJECTS\SentinelX`:
```powershell
# Set PYTHONPATH to the backend folder
$env:PYTHONPATH = "backend"

# (Optional) Export your Sarvam API Key if available:
# $env:SARVAM_API_KEY = "your_sarvam_api_key_here"

# Launch Uvicorn with auto-reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Health verification:*
- Forensic Engine: `http://127.0.0.1:8000/api/v1/forensics/health` (HTTP 200)
- OpenAPI Specification: `http://127.0.0.1:8000/docs`

#### Step 2: Start Frontend Development Server
From `c:\PROJECTS\SentinelX\frontend`:
```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```
*Application URL:* `http://127.0.0.1:5173`

The application will launch directly into the **TARKA Forensic Workstation** with the canonical benchmark case `upi_payment_discrepancy` pre-loaded.

---

### 4. Optional Infrastructure Integrations

TARKA is engineered with **fail-safe degradation**. If external services are offline, the application continues to operate using its internal fallbacks:

| Service | Port | Normal Operation | Offline Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | 5432 | Primary relational persistence | Async SQLite memory/file store (`sentinelx.db`) |
| **MinIO / RustFS** | 9000 | S3-compatible CAS byte storage | Local filesystem CAS store (`data/storage/artifacts/`) |
| **Neo4j** | 7687 | Fast graph projection & query | In-memory NetworkX/Python graph projection |
| **Redis** | 6379 | Token revocation blacklist & cache | In-memory bounded cache dictionary |
| **OpenPolicyAgent** | 8181 | External Rego policy evaluation | Internal Python 7-Factor PolicyGateway |
| **Sarvam Cloud STT/TTS**| 443 | Indian neural speech synthesis | Client-side Web Speech API & typed text fallback |

---

### 5. Automated Verification Procedures

Run the test suites to verify system integrity:

#### A. SentinelX × TARKA Unified Integration Suite (32 tests)
```powershell
$env:PYTHONPATH = "backend"
python -m pytest backend/tests/test_tarka_sentinelx_integration.py -v
```
*Expected: 32 passed (covers case lifecycle, Z3 SMT contradiction detection, Section 63 BSA report generation, RBAC isolation, evidence intake, and Sarvam agent orchestration).*

#### B. Canonical TARKA Forensics Core Suite (310 tests)
```powershell
$env:PYTHONPATH = "backend"
python -m pytest backend/tests_tarka/tests -q
```
*Expected: 310 passed in ~26 seconds.*

#### C. End-to-End Synthetic Case Verification
```powershell
$env:PYTHONPATH = "backend"
python -m pytest backend/tests/verify_forensics_e2e.py -v
```
*Expected: 1 passed (full round-trip evidence intake, Z3 verification, and Section 63 BSA tamper check).*

#### D. Frontend Production Build Check
```powershell
cd frontend
npm run build
```
*Expected: Clean Vite production build with 0 TypeScript/lint errors.*

---

### 6. Troubleshooting Common Issues

1. **Sarvam AI Audio Fails or Times Out**:
   - Check if `SARVAM_API_KEY` is valid via `GET /api/v1/forensics/sarvam/status`.
   - If `api_configured: false`, the system will use local speech synthesis automatically.
   - For `bulbul:v4-flash`, ensure speaker persona is set to a valid persona ID (e.g. `shubh_enhi_ads`, `kavya_ta_narrative`). The adapter maps legacy names automatically.
2. **Microphone Access Blocked in Browser**:
   - Ensure you are accessing via `http://localhost:5173` or `http://127.0.0.1:5173` (browsers require HTTPS or localhost for audio capture permissions).
   - Click the "Microphone" prompt in the browser URL bar to grant access.
   - If microphone is denied, the voice modal automatically displays a text input fallback.
3. **CORS Errors on API Calls**:
   - Verify `frontend/vite.config.ts` includes proxy configuration forwarding `/api` to `http://127.0.0.1:8000`.
4. **Case Access Denied (HTTP 403 / 401)**:
   - The workstation enforces 7-factor RBAC. If you toggle the officer identity to `INVESTIGATOR_GURUGRAM` (unauthorized), all case requests will fail closed as required by law. Toggle back to `INVESTIGATOR_DELHI` to resume access.
