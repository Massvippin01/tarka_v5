# Getting Started with TARKA on Windows

A step-by-step, beginner-friendly guide for cloning, configuring, running, and testing the **TARKA** digital forensics platform on a Windows laptop.

---

## 1. Prerequisites Checklist

Before beginning, ensure you have the following installed on your Windows machine:

1. **Git for Windows**: [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. **Python 3.11 or 3.12**: [https://www.python.org/downloads/windows/](https://www.python.org/downloads/windows/)  
   *(Ensure you check "Add python.exe to PATH" during installation).*
3. **Node.js (LTS version 18, 20, or 22)**: [https://nodejs.org/](https://nodejs.org/)
4. **PowerShell 7+ or Windows Terminal** (Standard Windows PowerShell works out of the box).
5. *(Optional)* **Docker Desktop for Windows**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)  
   *(Required only if you wish to run PostgreSQL, Neo4j, MinIO, and OpenSearch in containers).*

---

## 2. Clone the Repository

Open Windows PowerShell and run:

```powershell
# Navigate to your desired development directory
cd C:\Users\$env:USERNAME\Projects

# Clone the TARKA repository
git clone https://github.com/Yaathrapalani/tarka.git

# Enter the repository root
cd tarka
```

---

## 3. Configure Local Environment Files

Create your local `.env` configuration file from the safe example template:

```powershell
# Copy the root template
Copy-Item .env.example .env

# Copy the backend template
Copy-Item backend\.env.example backend\.env
```

### Adding Your Sarvam AI Voice Key (Optional)

TARKA uses **Sarvam AI** for neural Indic speech-to-text (`saaras:v4`) and text-to-speech (`bulbul:v4-flash`).

1. Register for a developer account at [https://sarvam.ai](https://sarvam.ai).
2. Generate an API subscription key from the developer console.
3. Open `.env` in Notepad:
   ```powershell
   notepad .env
   ```
4. Set your key on line 114:
   ```ini
   SARVAM_API_KEY=your_actual_api_key_here
   ```
5. Save and close Notepad. Also update `backend\.env` with the same key.

> **Offline Mode Note**: If you do not have a Sarvam API key, **leave it blank**. TARKA will automatically run in fail-closed offline mode: forensic reasoning and full textual answers are rendered cleanly with a transparent status notice, and robotic browser speech synthesis remains safely disabled.

---

## 4. Launching the Application (Recommended Native Mode)

The quickest and most resource-efficient way to run TARKA on Windows is using two PowerShell terminal windows:

### Terminal 1: Start the Backend (FastAPI + Z3 Logic Solver)

```powershell
cd C:\Users\$env:USERNAME\Projects\tarka\backend

# Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Upgrade pip and install backend requirements
python -m pip install --upgrade pip
pip install -r requirements.txt

# Launch the FastAPI backend server
uvicorn app.main:app --reload --port 8000
```

*Expected output:*
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Terminal 2: Start the Frontend (Vite + React + TypeScript)

Open a **new** PowerShell window:

```powershell
cd C:\Users\$env:USERNAME\Projects\tarka\frontend

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```

*Expected output:*
```
  VITE v8.0.16  ready in 450 ms

  ➜  Local:   http://127.0.0.1:5173/
  ➜  Network: use --host to expose
```

---

## 5. Alternative: Launching via Docker Compose

If you have Docker Desktop running and prefer containerized services:

```powershell
cd C:\Users\$env:USERNAME\Projects\tarka

# Start the development topology
docker compose -f docker-compose.dev.yml up -d

# Inspect running services
docker compose -f docker-compose.dev.yml ps
```

To stop Docker services safely without deleting data:
```powershell
docker compose -f docker-compose.dev.yml stop
```

---

## 6. Accessing the Application & Running the Synthetic Demo Case

1. Open your browser and navigate to:  
   **[http://127.0.0.1:5173/?case=upi_payment_discrepancy&nav=investigations](http://127.0.0.1:5173/?case=upi_payment_discrepancy&nav=investigations)**

2. **Explore the Synthetic Case**:
   - Case ID: `upi_payment_discrepancy`
   - Description: A ₹25,000 digital payment discrepancy across a bank ledger, WhatsApp chat, and counterparty claim screenshot.
   - Inspect the **Evidence Graph**, **Timeline Lens**, and **Provenance DAG**.

3. **Activate TARKA Conversational Forensics**:
   - Click the central **Voice Sphere** or **"Start Conversation"** button in the header.
   - Grant browser microphone permissions when prompted (used for ambient listening and push-to-talk).
   - In the modal, click the prompt:  
     `"Explain this case in simple English."`  
     *(Or speak naturally in English, Tamil, Hindi, or Bengali).*

4. **Verify the Results**:
   - **Reasoning**: TARKA executes the deterministic Z3 SMT logic engine to compare mathematical amounts.
   - **Contradiction**: It identifies that the bank record shows ₹25,000 was debited, while the screenshot asserts only ₹15,000 was paid, isolating an irreconcilable ₹10,000 discrepancy.
   - **Audio Playback**: The spoken rationale is synthesized via Sarvam Bulbul with zero latency stuttering.
   - **Provenance & Citations**: Click **"Preview Bank Record"** or **"Preview Screenshot Claim"** to inspect original SHA-256 CAS hashes.

5. **Generate a Section 63 BSA Statutory Certificate**:
   - In the voice modal or workspace, click **"Generate statutory Section 63 BSA report"**.
   - Review the confirmation gate and authorize generation.
   - TARKA produces a cryptographically sealed, tamper-evident PDF report stored in `data/cases/upi_payment_discrepancy/reports/`.

---

## 7. Running Verification & Smoke Tests

Verify that your installation is completely functional:

### A. Run Regression & Acceptance Tests (No External API Required)
```powershell
cd C:\Users\$env:USERNAME\Projects\tarka
python -m pytest backend/tests/test_tarka_multilingual_voice_acceptance.py backend/tests/test_tarka_voice_modal_refinement.py backend/tests/test_sarvam_live_smoke.py
```
*Expected result: 30 passed, 1 skipped in ~10s (live smoke test skips safely without live flag).*

### B. Run the Real Sarvam Voice Live Smoke Test (Requires API Key)
```powershell
$env:RUN_LIVE_SARVAM_TEST = "1"
python -m pytest backend/tests/test_sarvam_live_smoke.py -v
```
*Expected result: 2 passed in ~8s (verifies actual WAV audio response, RIFF headers, and speaker mapping).*

### C. Run Frontend Production Build Check
```powershell
cd C:\Users\$env:USERNAME\Projects\tarka\frontend
npm run build
```
*Expected result: `✓ built in ~8s` with 0 TypeScript errors.*

---

## 8. Safe Shutdown Procedure

To cleanly stop the application:

1. **Terminal 1 (Backend)**: Press `Ctrl + C` in the PowerShell window running Uvicorn.
2. **Terminal 2 (Frontend)**: Press `Ctrl + C` in the PowerShell window running Vite.
3. If running Docker: `docker compose -f docker-compose.dev.yml stop`

All case evidence, CAS hashes, and generated reports in `data/cases/` remain safe and intact.

---

## 9. Common Windows Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `uvicorn: command not found` | Virtual environment not activated. | Run `.\venv\Scripts\Activate.ps1`. If PowerShell blocks script execution, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`. |
| Port `8000` or `5173` already in use | Another service is using the port. | Check running processes using `netstat -ano \| findstr :8000` and stop the conflicting PID. |
| Microphone not detected in browser | Browser permissions denied. | In Chrome/Edge, click the padlock/tune icon in the address bar and set **Microphone** to **Allow**. |
| `Voice synthesis unconfigured` banner | `SARVAM_API_KEY` is empty. | This is normal and safe for offline testing. Spoken text is displayed visually. To enable audio, supply a key in `.env`. |
| Docker Desktop connection error | Docker engine is starting or stopped. | Open the Docker Desktop app from the Start menu and wait until the whale icon turns steady green. |
