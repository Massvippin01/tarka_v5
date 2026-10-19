# TARKA × SENTINELX SETUP GUIDE
## Reproducible Installation & Operations Manual

---

### 1. System Requirements

- **Operating System**: Windows 10/11 (64-bit) or Linux (Ubuntu 22.04+ / Debian 12+)
- **Python**: Version 3.11 or 3.12 (64-bit)
- **Node.js**: Version 18.x or 20.x with `npm`
- **RAM**: Minimum 4 GB (8 GB recommended)
- **Disk Space**: ~2 GB for dependencies, caches, and test cases

---

### 2. Backend Installation (Python 3.12)

From the repository root `c:\PROJECTS\SentinelX`:

```powershell
# 1. (Optional) Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows
# source venv/bin/activate    # On Linux / macOS

# 2. Install core SentinelX dependencies
pip install -r backend/requirements.txt

# 3. Install pure-Python TARKA forensic dependencies
pip install -r backend/requirements-tarka.txt

# Or install directly:
pip install z3-solver faker pypdf piexif pypdfium2
```

---

### 3. Frontend Installation & Build (Vite + React)

From the `frontend/` directory:

```powershell
cd frontend

# Install Node dependencies
npm install

# Verify TypeScript compilation and production bundle
npm run build

# Start the Vite development server (port 5173)
npm run dev
```

---

### 4. Running the Unified Forensic Application

From the repository root:

```powershell
# Windows PowerShell:
$env:PYTHONPATH="c:\PROJECTS\SentinelX\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Linux / bash:
export PYTHONPATH="$(pwd)/backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **SentinelX Nexus Canvas**: `http://localhost:5173`
- **Forensic Intelligence API Docs**: `http://localhost:8000/docs`
- **TARKA Engine Health Endpoint**: `http://localhost:8000/api/v1/forensics/health`

---

### 5. Running the Automated Test Suites

#### A. Run SentinelX × TARKA Integration Test Suite (13 tests)
```powershell
$env:PYTHONPATH="c:\PROJECTS\SentinelX\backend"
python -m pytest backend/tests/test_tarka_sentinelx_integration.py -v
```
*Expected: 13 passed in ~6 seconds.*

#### B. Run TARKA Canonical Forensics Test Suite (281 tests)
```powershell
$env:PYTHONPATH="c:\PROJECTS\SentinelX\backend"
python -m pytest backend/tests_tarka/tests -q
```
*Expected: 281 passed in ~26 seconds.*

#### C. Run Frontend Build Validation
```powershell
cd frontend
npm run build
```
*Expected: Clean Vite build with 0 TypeScript errors.*

---

### 6. Optional: Local SLM Acceleration with Ollama

The platform automatically detects local Ollama instances. If no model is installed, it gracefully falls back to the deterministic pure-Python forensic assistant without failing or requiring internet access.

To enable local LLM acceleration:
1. Install [Ollama](https://ollama.ai)
2. Start the daemon and pull a model:
   ```bash
   ollama run llama3:8b
   ```
3. SentinelX will auto-detect the runtime at `http://localhost:11434` and switch to local GPU/CPU inference.
