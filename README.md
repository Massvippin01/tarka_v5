# TARKA (तर्क)
### Indigenous Digital Forensics Investigation & Evidence-Analysis Platform

> **TARKA** is a voice-first, AI-assisted digital forensics platform designed for investigating complex financial fraud, cybercrime, and multi-source discrepancy cases. It pairs deterministic formal logic verification (via the Z3 SMT solver) with cryptographic evidence preservation (SHA-256 CAS), immutable chain-of-custody ledgers, and conversational Indic voice intelligence powered by Sarvam AI.

---

## Quick Start (30 Seconds to Launch)

```powershell
# 1. Clone the repository
git clone https://github.com/Yaathrapalani/tarka.git
cd tarka

# 2. Configure environment
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env

# 3. Start Backend (Terminal 1)
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 4. Start Frontend (Terminal 2)
cd ..\frontend
npm install
npm run dev

# 5. Open your browser:
# http://127.0.0.1:5173/?case=upi_payment_discrepancy&nav=investigations
```

---

## What TARKA Does

Traditional forensic workflows suffer from cognitive overload when cross-referencing conflicting bank statements, chat logs, call detail records (CDRs), and screenshot receipts. TARKA addresses this through four core capabilities:

1. **Deterministic Contradiction Detection**: Replaces statistical guessing with formal Z3 SMT constraint solving. Mathematical inconsistencies (e.g., a ₹25,000 ledger debit vs. a ₹15,000 screenshot claim) are proven with mathematical certainty.
2. **Cryptographic Content-Addressed Storage (CAS)**: Every piece of evidence is immutable and hashed via SHA-256 upon intake. Raw evidence bytes are preserved bit-for-bit in an append-only custody ledger.
3. **Conversational Multilingual Voice (Sarvam AI)**: Natural turn-taking in Indian English, Tamil, Hindi, Telugu, and Bengali via Sarvam Saaras STT (`saaras:v4`) and Bulbul TTS (`bulbul:v4-flash`). Operates with zero robotic browser speech fallback.
4. **Statutory Legal Compliance (Section 63 BSA)**: Automatically generates cryptographically sealed, tamper-evident forensic certificates compliant with Section 63 of the Bharatiya Sakshya Adhiniyam, 2023.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Frontend ["TARKA Frontend (React 19 + Vite + TypeScript)"]
        UI[Forensic Workstation & Graph Explorer]
        VAD[Local Web Audio VAD & Noise Suppression]
        Orb[Tarka Particle Orb Interface]
        Client[Axios Client with Request Timeout Guard]
    end

    subgraph Backend ["TARKA Core Services (FastAPI)"]
        API[Forensics & Investigation REST API]
        Auth[AuthService & Statutory RBAC Gate]
        Agent[Conversational Forensics Agent]
        Z3[Z3 SMT Solver Contradiction Engine]
        BSAReport[Section 63 BSA Certificate Generator]
        VoiceSvc[Sarvam Voice Service]
    end

    subgraph Storage ["Authority & Evidence Persistence"]
        CAS[Content-Addressed Evidence Vault (SHA-256)]
        CustodyDB[(SQLite / PostgreSQL Custody Ledger)]
        GraphDB[(Neo4j Knowledge Graph Projection)]
    end

    subgraph CloudVoice ["External Speech Engine (Server-Side Only)"]
        SarvamCloud[Sarvam AI Cloud: Saaras STT & Bulbul TTS]
    end

    UI --> Client
    VAD --> Orb
    Orb --> Client
    Client --> API
    API --> Auth
    Auth --> Agent
    Agent --> Z3
    Agent --> BSAReport
    Agent --> VoiceSvc
    VoiceSvc -->|HTTPS / Private Key| SarvamCloud
    Z3 --> CAS
    BSAReport --> CustodyDB
    Agent --> GraphDB
```

---

## Feature & Dependency Matrix

| Component | Status | Dependency | Fallback / Offline Behavior |
|---|---|---|---|
| **Z3 SMT Contradiction Engine** | **VERIFIED** | Python `z3-solver` | Self-contained, fully local, deterministic. |
| **Evidence CAS & Merkle Custody**| **VERIFIED** | Local Filesystem / SQLite | Bitstream verified via SHA-256 CAS; stored in `data/cases/<case_id>/`. |
| **Section 63 BSA PDF Generator** | **VERIFIED** | Python `reportlab` | Generates sealed statutory certificates locally. |
| **Conversational Voice Assistant** | **VERIFIED** | Sarvam AI Cloud (Optional) | If `SARVAM_API_KEY` is missing, fails closed with transparent text-only rationale. |
| **Knowledge Graph Traversal** | **VERIFIED** | Neo4j / In-Memory Network | Interactive 2D/3D explorer works in-memory without Neo4j. |
| **Statutory Policy Engine** | **VERIFIED** | Python / OPA (Optional) | Local fail-closed enforcement if OPA container is offline. |

---

## Prerequisites

- **Operating System**: Windows 10/11, macOS, or Ubuntu Linux.
- **Python**: Version `3.11` or `3.12` (with pip and venv).
- **Node.js**: Version `18.x`, `20.x`, or `22.x` (with npm).
- **Git**: Installed and available in PATH.
- *(Optional)* **Docker Desktop**: If running containerized PostgreSQL, Neo4j, or MinIO.
- *(Optional)* **Sarvam AI API Key**: For neural Indic voice synthesis ([sarvam.ai](https://sarvam.ai)).

---

## Environment Configuration

Copy the example template to create your `.env` file:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

Key environment variables in `.env`:

```ini
# Core Configuration
APP_ENV=development
DEBUG=true
SECRET_KEY=tarka_secure_development_secret_key_minimum_32_characters

# Voice Configuration (Sarvam AI)
# Obtain your key at: https://sarvam.ai
SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_API_BASE_URL=https://api.sarvam.ai
SARVAM_STT_MODEL=saaras:v4
SARVAM_TTS_MODEL=bulbul:v4-flash
SARVAM_DEFAULT_SPEAKER=shubh_enhi_ads
```

> **Security Note**: Never commit `.env` or expose `SARVAM_API_KEY` to client-side bundles. TARKA keeps all speech provider credentials strictly server-side.

---

## Development Workflows

### 1. Native Windows Workflow (Recommended)

Run the backend and frontend in separate PowerShell terminal windows:

```powershell
# Terminal 1: Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### 2. Docker Compose Workflow

To launch the full containerized stack:

```powershell
# Start services in the background
docker compose -f docker-compose.dev.yml up -d

# Check health and status
docker compose -f docker-compose.dev.yml ps

# View backend logs
docker compose -f docker-compose.dev.yml logs -f backend

# Stop services safely without deleting data
docker compose -f docker-compose.dev.yml stop
```

---

## First-Run Demo: `upi_payment_discrepancy`

TARKA includes a self-contained synthetic case: `upi_payment_discrepancy`.

1. Launch TARKA and open:  
   **`http://127.0.0.1:5173/?case=upi_payment_discrepancy&nav=investigations`**
2. Click the central **Voice Sphere** or **"Start Conversation"** button.
3. Click the suggested query: **`"Explain this case in simple English."`**
4. **Observe the Results**:
   - The Z3 solver compares the banking debit ledger (₹25,000) against the visual screenshot claim (₹15,000).
   - TARKA explains the mathematical contradiction in plain language.
   - Spoken audio is synthesized via Sarvam Bulbul with zero robotic browser speech fallback.
   - Click **"Preview Bank Record"** or **"Preview Screenshot Claim"** to inspect raw SHA-256 CAS bitstreams.
5. Click **`"Generate statutory Section 63 BSA report"`** to generate a signed legal certificate.

---

## Conversational Voice Assistant Specifications

- **Foundational Models**: Sarvam Saaras STT (`saaras:v4`) and Bulbul TTS (`bulbul:v4-flash`).
- **Supported Languages**: Indian English (`en-IN`), Tamil (`ta-IN`), Hindi (`hi-IN`), Telugu (`te-IN`), Bengali (`bn-IN`).
- **Verified Personas**: `shubh_enhi_ads` (Formal Male), `simran_enhi_companion` (Conversational Female), `gokul_ta_narration` (Tamil Male), `kavitha_te_narration` (Telugu Female), `arnab_bn_conversation` (Bengali Male).
- **Hands-Free Ambient Listening**: Ephemeral audio ring buffer with local Voice Activity Detection (VAD) and Acoustic Echo Cancellation (AEC).
- **Epistemic Privacy Boundary**: Raw case evidence is **never** sent to speech APIs. Only sanitized, structured forensic summaries generated by the local solver are synthesized.

---

## Verification & Testing

```powershell
# Run acceptance and regression test suites
python -m pytest backend/tests/test_tarka_multilingual_voice_acceptance.py backend/tests/test_tarka_voice_modal_refinement.py backend/tests/test_sarvam_live_smoke.py

# Run live Sarvam Bulbul synthesis smoke test (requires SARVAM_API_KEY)
$env:RUN_LIVE_SARVAM_TEST = "1"
python -m pytest backend/tests/test_sarvam_live_smoke.py -v

# Run frontend production build validation
cd frontend
npm run build
```

---

## Troubleshooting

| Symptom | Cause | Remedy |
|---|---|---|
| `Voice synthesis unconfigured` notice | `SARVAM_API_KEY` is not set in `.env`. | This is expected in offline mode. TARKA renders text-only forensic rationale. Add a key to `.env` to enable audible speech. |
| Port 8000 or 5173 occupied | A previous process is still running. | Run `netstat -ano \| findstr :8000` in PowerShell and stop the conflicting PID. |
| Microphone permission error | Browser blocked microphone access. | Click the permissions icon in the address bar and allow microphone access. |
| PowerShell script activation blocked | Windows execution policy restriction. | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell. |

---

## Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints (cases, evidence, voice, reports)
│   │   ├── intelligence/    # Sarvam voice service, Z3 solver, reasoning engines
│   │   ├── domain/          # Core forensic models (entities, relationships, findings)
│   │   └── services/        # Authentication, custody chain, statutory governance
│   └── tests/               # Unit, acceptance, regression, and live smoke test suites
├── frontend/
│   ├── src/
│   │   ├── components/      # Particle orb, voice modal, evidence graph, timeline lens
│   │   ├── context/         # Investigation context and state machines
│   │   └── api/             # Frontend API client with timeout guards
│   └── public/              # Static assets and icons
├── data/cases/              # Synthetic case fixtures (upi_payment_discrepancy)
├── docs/                    # Getting started, configuration reference, release notes
├── docker-compose.dev.yml   # Local development container topology
└── docker-compose.yml       # Production baseline container topology
```

---

## License & Attribution

Developed for the **SUTRAM 2026 / SIH 2026** Datathon. All case, person, and transaction data in `data/cases/` is purely synthetic and fictional.