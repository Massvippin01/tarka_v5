# SentinelX Clean-Machine Reproduction Script (PowerShell)
# Usage: .\scripts\reproduce.ps1 [-Mode dev|test|ci]

param (
    [string]$Mode = "test"
)

$ErrorActionPreference = "Stop"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SENTINELX CLEAN MACHINE REPRODUCIBILITY HARNESS " -ForegroundColor Cyan
Write-Host " Mode: $Mode" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Environment Verification
Write-Host "[1/7] Checking Python and Node runtimes..." -ForegroundColor Yellow
python --version
node --version
npm --version

# 2. Virtual Environment & Dependencies
Write-Host "[2/7] Initializing Python Virtual Environment..." -ForegroundColor Yellow
if (-not (Test-Path "venv")) {
    python -m venv venv
}
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# 3. Frontend Dependencies
Write-Host "[3/7] Installing Frontend Dependencies..." -ForegroundColor Yellow
Push-Location frontend
npm ci --prefer-offline --no-audit
Pop-Location

# 4. Configuration Setup
Write-Host "[4/7] Ensuring environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.development.example" ".env"
    Write-Host "Created .env from .env.development.example" -ForegroundColor Green
}
if (-not (Test-Path "backend\.env")) {
    Copy-Item ".env.development.example" "backend\.env"
    Write-Host "Created backend\.env from .env.development.example" -ForegroundColor Green
}

# 5. Database Migrations / Schema Initialization
Write-Host "[5/7] Initializing Local Schema & Repositories..." -ForegroundColor Yellow
.\venv\Scripts\python.exe -c "from app.database.init_db import initialize_database; initialize_database()"

# 6. Test Suite Execution
Write-Host "[6/7] Running Deterministic Regression & Wave Evaluation..." -ForegroundColor Yellow
.\venv\Scripts\pytest.exe backend/tests -v

# 7. Frontend Production Build Verification
Write-Host "[7/7] Validating Frontend Production Build..." -ForegroundColor Yellow
Push-Location frontend
npm run build
Pop-Location

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " ✓ SENTINELX CLEAN REPRODUCTION VERIFICATION SUCCEEDED " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
