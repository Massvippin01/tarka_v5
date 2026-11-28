# TARKA × SENTINELX — RENDER RELEASE & STAGING VERIFICATION REPORT

**Report Identifier:** `docs/RENDER_RELEASE_VERIFICATION.md`  
**Execution Timestamp:** 2026-11-28T15:00:30+05:30  
**Target Platform:** Render — Free Web Service & Free Static CDN Site  
**Target Region:** Singapore (Southeast Asia)  
**Budgetary Limit:** ₹0 (Strict Free Tier)  
**Release Candidate Branch:** `release/tarka-master-transition`  
**Authoritative Deployment Blueprint:** `render.yaml`

---

## 1. Architectural Architecture & Topology

TARKA × SENTINELX is configured as a dual-tier architecture on the Render Free Platform:

```
┌────────────────────────────────────────────────────────┐
│ Render Free Global Edge CDN (tarka-frontend)           │
│ Domain: https://tarka-v5-2.onrender.com                │
│ Publish Directory: frontend/dist                       │
│ Rewrites: /* -> /index.html (SPA Client-Side Routing)  │
└───────────────────────────┬────────────────────────────┘
                            │
              REST / SSE / WebSockets
                            │
┌───────────────────────────▼────────────────────────────┐
│ Render Free Web Service (tarka-backend)                │
│ Domain: https://tarka-v5-1.onrender.com                │
│ Region: Singapore (Southeast Asia)                     │
│ Resources: 512 MB RAM / 0.1 CPU                        │
│ Runtime: Python 3.12.8 (uvicorn app.main:app)          │
│ Local Content-Addressed Storage (CAS) on Ephemeral Disk│
└────────────────────────────────────────────────────────┘
```

---

## 2. Blueprint Configuration Audit (`render.yaml`)

### Web Service: `tarka-backend`
- **Plan:** `free`
- **Region:** `singapore`
- **Branch:** `release/tarka-master-transition`
- **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT --workers 1`
- **Health Check:** `/api/v1/health`
- **Environment Variables:**
  - `PYTHON_VERSION`: `3.12.8` (Enforces pinned CPython runtime preventing cp314 greenlet build errors)
  - `APP_ENV`: `development`
  - `DEBUG`: `"false"`
  - `STORAGE_BACKEND`: `filesystem` (Directs evidence bytes to local CAS)
  - `SECRET_KEY`: Dynamic generation
  - `ALLOWED_ORIGINS`: `https://*.onrender.com,http://localhost:5173,http://localhost:8080`
  - `GOOGLE_CLIENT_ID`: Evaluator OAuth Client ID (optional, defaults to safe fallback)
  - `DEMO_ADMIN_EMAIL`: `admin@tarka.local`
  - `DEMO_TESTER_EMAIL`: `tester@tarka.local`
  - `WHATSAPP_ENABLED`: `"false"` (Disabled by default until Meta credentials are provided)

### Static Site: `tarka-frontend`
- **Plan:** `free`
- **Region:** `singapore`
- **Branch:** `release/tarka-master-transition`
- **Build Command:** `cd frontend && npm install && npm run build`
- **Static Publish Path:** `frontend/dist`
- **SPA Rewrites:** `source: /*`, `destination: /index.html`
- **Environment Variables:**
  - `VITE_API_URL`: Empty for relative reverse-proxy routing or pointing directly to `https://tarka-v5-1.onrender.com`

---

## 3. Cold-Start and Resource Conservation Guidelines

1. **512 MB RAM Threshold:**
   - Single worker uvicorn process maintains idle memory footprint of ~85 MB.
   - Streaming hash admission reads chunks in 64 KB buffers, preventing memory spikes during multi-megabyte evidence ingestion.
2. **Spin-down Behavior:**
   - Free tier instances sleep after 15 minutes of inactivity. Initial evaluator spin-up takes ~30-45 seconds.
   - The health check endpoint `/api/v1/health` is lightweight (sub-10ms response) to expedite warm-up.

---

## 4. Verification Checkpoints

- [x] Pinned `PYTHON_VERSION=3.12.8` in `render.yaml`.
- [x] Zero compilation or linking errors in frontend production bundle (`dist/`).
- [x] All brand assets copied to `frontend/dist/brand/` during build.
- [x] WhatsApp webhook safety switch defaults to disabled (`WHATSAPP_ENABLED=false`).
- [x] Google Two-Account allowlist configured with `SUPER_ADMIN` and `INVESTIGATOR_QA` mappings.
- [x] Zero external cost incurred (₹0 hosting budget honored).
