#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " SENTINELX CLEAN MACHINE REPRODUCIBILITY HARNESS (POSIX)"
echo "=========================================================="

echo "[1/7] Checking runtimes..."
python3 --version
node --version
npm --version

echo "[2/7] Initializing virtualenv..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

echo "[3/7] Installing Frontend dependencies..."
cd frontend
npm ci --prefer-offline --no-audit
cd ..

echo "[4/7] Ensuring environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.development.example .env
fi
if [ ! -f "backend/.env" ]; then
    cp .env.development.example backend/.env
fi

echo "[5/7] Initializing Schema & Repositories..."
PYTHONPATH=backend ./venv/bin/python -c "from app.database.init_db import initialize_database; initialize_database()"

echo "[6/7] Running test suites..."
PYTHONPATH=backend ./venv/bin/pytest backend/tests -v

echo "[7/7] Validating frontend build..."
cd frontend
npm run build
cd ..

echo "=========================================================="
echo " ✓ REPRODUCIBILITY SUCCEEDED"
echo "=========================================================="
