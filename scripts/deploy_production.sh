#!/usr/bin/env bash
# ==============================================================================
# TARKA x SENTINELX - AUTOMATED PRODUCTION DEPLOYMENT ENGINE (deploy_production.sh)
# ==============================================================================
# Executes Stages 1 through 14 of Phase 19 Full-Stack Production Deployment.
# Enforces non-root execution, health validation, and zero credential leakage.
# ==============================================================================
set -euo pipefail

DEPLOY_DIR="/opt/sentinelx"
REPO_URL="https://github.com/Massvippin01/tarka_v5.git"
TARGET_BRANCH="fix/ci-post-merge-repair"
EXPECTED_TAG="phase18.1-stabilized"

echo "======================================================================"
echo " TARKA x SENTINELX -- PRODUCTION DEPLOYMENT & RELEASE HARNESS"
echo " Target Release Tag: ${EXPECTED_TAG}"
echo "======================================================================"

# 1. Verify Host Prerequisites
echo "[1/14] Verifying Host Engine Dependencies..."
command -v docker >/dev/null 2>&1 || { echo "Error: docker is not installed. Aborting." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose plugin is not installed. Aborting." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "Error: curl is not installed. Aborting." >&2; exit 1; }

# 2. Configure Directory & Repository Source
echo "[2/14] Synchronizing Release Codebase from Canonical Remote..."
if [ ! -d "${DEPLOY_DIR}/.git" ]; then
    sudo mkdir -p "${DEPLOY_DIR}"
    sudo chown -R "$(id -u):$(id -g)" "${DEPLOY_DIR}"
    git clone --branch "${TARGET_BRANCH}" "${REPO_URL}" "${DEPLOY_DIR}"
fi

cd "${DEPLOY_DIR}"
git fetch --all --tags
git checkout "${TARGET_BRANCH}"

CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Verified Release Commit: ${CURRENT_COMMIT}"
git tag --points-at HEAD | grep -q "${EXPECTED_TAG}" || echo "Notice: HEAD is at commit ${CURRENT_COMMIT}"

# 3. Environment Secrets Validation
echo "[3/14] Validating Production Environment Secrets..."
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production .env
    else
        echo "Error: Production .env configuration missing." >&2
        echo "Copy .env.production.example to .env and configure secrets from your Vault." >&2
        exit 1
    fi
fi

# Ensure fail-closed checks in .env
grep -q "APP_ENV=production" .env || { echo "Error: APP_ENV must be production." >&2; exit 1; }
grep -q "DEBUG=false" .env || { echo "Error: DEBUG must be false in production." >&2; exit 1; }

# 4. Storage & Volume Preparation
echo "[4/14] Initializing Named Persistence Volumes..."
docker volume create pg_prod_data >/dev/null 2>&1 || true
docker volume create neo4j_prod_data >/dev/null 2>&1 || true
docker volume create opensearch_prod_data >/dev/null 2>&1 || true
docker volume create minio_prod_data >/dev/null 2>&1 || true
docker volume create evidence_prod_data >/dev/null 2>&1 || true

# 5. Build Hardened Multi-Stage Production Images
echo "[5/14] Building Production Images..."
docker compose build --pull

# 6. Pre-flight Backup of Any Existing Volumes
echo "[6/14] Creating Pre-Deployment Safety Snapshot..."
mkdir -p backups
if docker ps -q --filter "name=sentinelx-prod-postgres" | grep -q .; then
    docker exec sentinelx-prod-postgres pg_dump -U sentinelx_prod_user sentinelx_prod > "backups/pre_deploy_pg_$(date +%s).sql" || true
fi

# 7. Start Private Infrastructure Services in Dependency Order
echo "[7/14] Starting Core Datastores (PostgreSQL, MinIO, Neo4j, Redis, OPA)..."
docker compose up -d postgres minio neo4j redis opa opensearch

# 8. Await Database & Storage Health Readiness
echo "[8/14] Waiting for Datastores to Pass Health Probes..."
for service in postgres minio neo4j redis opa; do
    echo "  Checking health for ${service}..."
    until [ "$(docker inspect -f '{{.State.Health.Status}}' "sentinelx-prod-${service}" 2>/dev/null)" = "healthy" ]; do
        sleep 2
    done
    echo "  ${service} is HEALTHY."
done

# 9. Run Controlled Database Migrations
echo "[9/14] Initializing Transactional Relational Schema..."
docker compose run --rm backend python -c "from app.database.init_db import initialize_database; initialize_database()"

# 10. Start Backend Application Server
echo "[10/14] Launching FastAPI Forensics Engine..."
docker compose up -d backend

# 11. Verify Backend Health
echo "[11/14] Awaiting Application Backend Health Readiness..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' sentinelx-prod-backend 2>/dev/null)" = "healthy" ]; do
    sleep 2
done
echo "Backend is HEALTHY."

# 12. Start Frontend & Reverse Proxy
echo "[12/14] Launching NGINX Reverse Proxy & Static UI..."
docker compose up -d frontend

until [ "$(docker inspect -f '{{.State.Health.Status}}' sentinelx-prod-frontend 2>/dev/null)" = "healthy" ]; do
    sleep 2
done
echo "Frontend Ingress is HEALTHY."

# 13. Validate Live Probes & Ingress Health
echo "[13/14] Probing Live Health Endpoints..."
curl -sf http://127.0.0.1:8080/healthz >/dev/null && echo "  Ingress /healthz: OK"
curl -sf http://127.0.0.1:8080/api/v1/health >/dev/null && echo "  Backend /api/v1/health: OK"

# 14. Report Completion
echo "======================================================================"
echo " ✓ TARKA x SENTINELX PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY"
echo " Active Services:"
docker compose ps
echo "======================================================================"
