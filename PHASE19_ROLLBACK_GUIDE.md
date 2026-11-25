# TARKA × SENTINELX — PHASE 19
## DETERMINISTIC ROLLBACK & RECOVERY GUIDE

**Report Identifier:** `PHASE19_ROLLBACK_GUIDE.md`  
**Phase:** Stage 9 — Final Release  
**Date:** 2026-11-25  
**Audience:** Site Reliability Engineers, DevOps Leads, Incident Responders  

---

## 1. ROLLBACK TRIGGER CONDITIONS

An immediate rollback to the previous stable release (`phase18.1-stabilized` at commit `c54196d` or `phase18-completed` at commit `2392f08`) MUST be initiated if any of the following occur:
1. **Health Check Failure:** Backend container fails to report healthy (`/api/v1/health`) within 60 seconds after deployment.
2. **Reverse Proxy Regression:** NGINX returns persistent HTTP 502/504 errors on `/api/` endpoints.
3. **Evidence Integrity Failure:** Newly ingested evidence fails SHA-256 CAS verification.
4. **Data Corruption Alert:** Relational schema migration fails partway through execution.
5. **Security Regression:** 7-factor RBAC fails to deny cross-case unauthorized access.

---

## 2. STEP-BY-STEP DETERMINISTIC ROLLBACK PROTOCOL

### Step 1: Halt Running Production Application Containers
Do NOT run `docker compose down -v` (which would delete named persistent volumes). Only stop the application containers:
```bash
cd /opt/sentinelx
docker compose stop backend frontend
```

### Step 2: Roll Back Codebase to Target Tag
```bash
# Checkout the known stable release tag
git fetch --all --tags
git checkout tags/phase18.1-stabilized

# Verify HEAD is pointing to the verified commit
git rev-parse HEAD
# Expected: c54196d6ffa6fb9f7aa7e02281ec155603419e55
```

### Step 3: Restore Pre-Deployment Database Snapshot (If Schema Was Modified)
```bash
# Identify the pre-deployment database backup created by deploy_production.sh
LATEST_BACKUP=$(ls -t backups/pre_deploy_pg_*.sql | head -1)
echo "Restoring database from ${LATEST_BACKUP}..."

# Drop current schema and restore from clean snapshot
docker exec -i sentinelx-prod-postgres psql -U sentinelx_prod_user -d sentinelx_prod < "${LATEST_BACKUP}"
```

### Step 4: Rebuild / Launch Rollback Container Images
```bash
# Rebuild containers from the rolled-back source
docker compose build backend frontend

# Launch services
docker compose up -d backend frontend
```

### Step 5: Await and Validate Health Readiness
```bash
# Verify backend readiness
until [ "$(docker inspect -f '{{.State.Health.Status}}' sentinelx-prod-backend)" = "healthy" ]; do
    sleep 2
done

# Verify frontend ingress readiness
until [ "$(docker inspect -f '{{.State.Health.Status}}' sentinelx-prod-frontend)" = "healthy" ]; do
    sleep 2
done

# Test public endpoints
curl -sf http://127.0.0.1:8080/healthz && echo "Ingress OK"
curl -sf http://127.0.0.1:8080/api/v1/health && echo "Backend OK"
```

---

## 3. ROLLBACK VERIFICATION & RESUMPTION CHECKLIST

After executing a rollback:
- [ ] Confirm `GET /healthz` returns HTTP 200 `healthy\n`.
- [ ] Confirm `GET /api/v1/health` returns status `healthy` with version `2.0.0`.
- [ ] Open the web dashboard in an incognito window and verify the V6 warm ivory UI renders properly.
- [ ] Log in as `INVESTIGATOR_DELHI` and verify `CASE-2026-001` dossier opens with all 5 admitted artifacts.
- [ ] Inspect `docker compose logs backend` to ensure zero database connection pool errors.
- [ ] Document the incident in post-mortem records.
