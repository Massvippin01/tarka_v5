# TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
# CLEAN-ENVIRONMENT DEPLOYMENT & INSTALLATION GUIDE

**Document Reference:** `docs/SUTRAM_PS04_DOCUMENTATION/13_DEPLOYMENT/CLEAN_ENVIRONMENT_DEPLOYMENT_GUIDE.md`  
**Target Environment:** Sovereign Air-Gapped Workstations & Enterprise Linux/Windows Servers  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. SYSTEM PREREQUISITES

| Component | Minimum Version | Recommended Specification | Purpose |
|---|---|---|---|
| **Operating System** | Windows 10/11 or Ubuntu 22.04 LTS | Windows 11 Enterprise / Ubuntu 24.04 LTS | Host Operating System |
| **Python** | Python 3.11.x | Python 3.12.x (64-bit) | Forensic Engine, SMT Solver, Backend API |
| **Node.js** | Node.js v18.x LTS | Node.js v20.x or v22.x LTS | React Workbench & Vite Bundler |
| **Package Managers** | pip 24.x, npm 10.x | pip 24.x, npm 10.x | Dependency Management |
| **Memory (RAM)** | 8 GB | 16 GB DDR4/DDR5 | In-Memory Graph & Z3 SMT Solver Cache |
| **Disk Space** | 2 GB free | 10 GB SSD free | Local Vault & Dependency Artifacts |
| **Optional Services** | Neo4j 5.x, PostgreSQL 16 | Docker Compose 2.x | High-Scale Production Graph / DB |

---

## 2. REPOSITORY CHECKOUT & BRANCH SETUP

```powershell
# Clone official repository
git clone https://github.com/Massvippin01/tarka_v5.git
Set-Location "tarka_v5"

# Switch to the authoritative PS04 competition branch
git checkout feat/sutram-2026-ps04-member-b
```

---

## 3. BACKEND INSTALLATION & RUNTIME CONFIGURATION

### 3.1 Virtual Environment Setup
```powershell
Set-Location "backend"

# Create isolated Python virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Upgrade pip & install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3.2 Environment Variable Configuration
Create or verify `.env` inside `backend/`:
```ini
TARKA_ENV=production
TARKA_PORT=8080
TARKA_HOST=127.0.0.1
AIR_GAP_MODE=true
Z3_TIMEOUT_MS=5000
SECRET_KEY=SUTRAM_2026_PS04_SECURE_HMAC_KEY_REPRODUCIBLE
```

### 3.3 Starting the Backend Server
```powershell
$env:PYTHONPATH=".;backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080
```
Backend will start on: `http://127.0.0.1:8080`  
Health check endpoint: `http://127.0.0.1:8080/api/health`

---

## 4. FRONTEND INSTALLATION & RUNTIME CONFIGURATION

### 4.1 Dependency Installation
```powershell
Set-Location "..\frontend"

# Install pure air-gapped node dependencies
npm install --prefer-offline --no-audit
```

### 4.2 Starting the Vite Frontend Server
```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend will start on: `http://127.0.0.1:5173`

---

## 5. PRODUCTION BUNDLE CREATION (AIR-GAP VERIFIED)

To build the static production distribution:
```powershell
Set-Location "frontend"
npm run build
```
Output directory `frontend/dist/` contains pure static assets with zero external CDN dependencies and 100% locally bundled Inter, JetBrains Mono, and Google Fonts.

