# TARKA (तर्क)
### Deterministic Cyber-Fraud Tracing & Golden-Hour Recovery Platform

> *"Drop in raw bank statements, telecom device logs, NCRP complaints, and UPI screenshots. TARKA isolates every mule network, links accounts to shared controller phones, traces recoverable balances forward in time, and drafts BNSS §106/§107 freeze notices and bilingual court reports — with every number backed by a SHA-256 chain of custody."*

---

## ⚡ Quickstart

### Option A: Local Dev (Backend + Frontend)
```bash
# 1. Clone repository
git clone https://github.com/Massvippin01/tarka_v5.git
cd tarka_v5

# 2. Build a clean demo database (optional, 1M-row / 50-gang dataset)
PYTHONPATH=backend venv/Scripts/python backend/tools/build_demo_db.py

# 3. Start backend (:8000) and frontend (:5173)
python -m uvicorn app.main:app --app-dir backend --port 8000
cd frontend && npm run dev
```

### Option B: Docker Compose (Lean Production Stack)
```bash
docker compose -f docker-compose.lean.yml up --build -d
```

---

## 🎯 Core Capabilities

| Capability | Engine & Implementation | Screen |
| :--- | :--- | :--- |
| **NCRP 1930 Complaint Matching** | Auto-matches victim CSV complaints against ingested transactions by account/VPA/phone, amount, and time window without inventing missing fields. | **Projects & Cases** |
| **Golden-Hour Rapid Containment** | Tracks elapsed seconds from complaint intake through statement ingestion, LIBR tracing, mule discovery, and bank freeze drafting. | **Upload Center** & **Triage** |
| **Scale Triage & Mule Scoring** | Deterministic two-pass SQL/graph scoring (`99.3%` precision at 1M rows), 72 h dormant-burst detection, and adaptive ranking by freezable ₹. | **① Triage** & **③ People & accounts** |
| **OCR & Receipt Tamper Forensics** | PaddleOCR / RapidOCR fallback with Indian-lakh parsing, EXIF/ELA/layout checks, and receipt-vs-bank-ledger reconciliation. | **② Evidence** |
| **Time-Aware LIBR Money Trail** | Strictly forward-in-time tracing using Lowest Intermediate Balance Rule (LIBR) to separate cashed-out funds from recoverable balances. | **④ Money trail** |
| **Controller Phone Attribution** | Clusters mule accounts sharing IMEI, IMSI, Wi-Fi BSSID, or IP while filtering carrier NAT (`> 25` accounts) and flagging SIM swaps. | **⑤ Network** & **⑥ Devices & SIMs** |
| **Bank Reply Loop & Bilingual Court Report** | Drafts per-bank **BNSS §106/§107** freeze notices (`Sent → Acknowledged → Frozen`), logs officer handover, and exports EN/HI SHA-256 PDFs. | **⑦ Actions & report** |
| **Grounded Local Copilot** | On-premise **Ollama (`llama3.1:8b`)** assistant with animated particle orb and strict `DATA_ONLY` prompt-injection defense. | **Ask TARKA** |

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend: React + Vite + TypeScript"]
        Shell["V6AppShell (Rail, Topbar Focus Breadcrumb, Case Switcher)"]
        Workflow["7-Step Workflow (Triage, Evidence, People, Money Trail, Network, Devices, Actions & Report)"]
        CopilotUI["Ask TARKA Copilot + Animated Particle Orb"]
    end

    subgraph Backend ["Backend: FastAPI (Python 3.12)"]
        AuthGate["AuthService (PBKDF2 + JWT + 7-Factor RBAC)"]
        Ingest["Resumable 8 MB Chunked Upload & OCR Forensics"]
        Engine["Deterministic Mule Scoring, LIBR Tracing & Device Attribution"]
        FreezeAPI["BNSS §106/§107 Freeze Notices, Bank Reply Loop & Handover"]
        CopilotEngine["Local Ollama (llama3.1:8b) Grounded DATA_ONLY Bridge"]
    end

    subgraph Authority ["Storage & Evidence Authority"]
        CAS["Append-Only Raw Evidence & SHA-256 Custody"]
        Derived[("Per-Case SQLite Derived Store & Identifier Index")]
        Postgres[("PostgreSQL Transactional Authority")]
    end

    Shell --> Workflow
    CopilotUI --> CopilotEngine
    Workflow --> AuthGate
    AuthGate --> Ingest
    AuthGate --> Engine
    AuthGate --> FreezeAPI
    Ingest --> CAS
    Engine --> Derived
    FreezeAPI --> Postgres
```

---

## 📸 Live UI Tour

### 1. Projects & NCRP 1930 Complaint Matching
*Groups related FIRs into one operation, auto-matches NCRP complaints to bank rows, and logs hash-chained officer handovers.*

![Projects & NCRP Complaint Matching](docs/demo/01-projects-ncrp.png)

---

### 2. Chunked Upload Center & Golden-Hour Clock
*Fingerprints every uploaded file with SHA-256 on arrival and tracks the live golden-hour containment clock.*

![Upload Center & Golden-Hour Clock](docs/demo/02-upload-golden-hour.png)

---

### 3. Adaptive Mule Triage (1M Rows / 50 Gangs)
*Isolates organized mule networks and ranks them by still-recoverable ₹ in a compact sortable table.*

![Mule Triage](docs/demo/03-triage-50-gangs.png)

---

### 4. Fraud Network & Controller Phone Attribution
*Maps victim-to-mule money flows alongside shared handset IMEIs ("14 mule accounts operated from 2 phones") and time-aware LIBR paths.*

![Fraud Network & Controller Attribution](docs/demo/04-network-14-mules-2-phones.png)

---

### 5. BNSS §106/§107 Freeze Notices & Bank Reply Loop
*Ranks accounts by freeze value, groups notices per bank, and tracks live bank responses (`Sent → Acknowledged → Frozen`).*

![Freeze Notices & Bank Reply Loop](docs/demo/05-freeze-bank-reply-handover.png)

---

### 6. Bilingual Court Report (English + हिन्दी)
*Exports SHA-256-sealed court annexures across Account, Network, Case, or Project scopes in English and Hindi.*

![Hindi Court Report](docs/demo/06-court-report-hindi.png)

---

## ⚖️ Investigative & Forensic Principles

1. **AI Proposes, Evidence Verifies, Human Decides**: TARKA never declares a person guilty or innocent — every flag carries a plain-English rationale and requires human confirmation.
2. **Immutable Evidence Integrity**: Raw evidence is append-only and SHA-256 hashed; content inside evidence is strictly `DATA_ONLY` and never treated as instructions.
3. **Deterministic Math, Zero Guessing**: Scoring, LIBR fund tracing, and device clustering are 100% deterministic and reproducible; missing data produces no signal rather than a guess.
4. **Indian Statutory Alignment**: Indian rupee formatting (`₹1,00,000`), **BNSS §§106–107** freeze/attachment workflows, and **BSA §63** electronic record certification.

---

## 🔒 License

Copyright © 2026 **Vippin Antony P & TARKA Engineering Team**. **All Rights Reserved.**  
See [LICENSE](LICENSE) for full terms — evaluation access only; no copying, modification, or redistribution without written permission.
