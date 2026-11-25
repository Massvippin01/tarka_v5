# TARKA × SENTINELX — RENDER ENVIRONMENT VARIABLES SPECIFICATION

**Report Identifier:** `RENDER_ENVIRONMENT_VARIABLES.md`  
**Purpose:** Exact Render Dashboard Configuration Reference  
**Deployment Tier:** Render Free Web Service (Backend) & Free Static Site (Frontend)  
**Region:** Singapore (Southeast Asia)  
**Budget:** ₹0  

---

## 1. BACKEND WEB SERVICE SETTINGS (`tarka-backend`)

Configure these values in the **Render Dashboard > Web Service > Settings**:

| Setting | Exact Value to Enter | Notes |
| :--- | :--- | :--- |
| **Name** | `tarka-backend` | Subdomain: `https://tarka-backend.onrender.com` |
| **Region** | `Singapore (Southeast Asia)` | Low latency for Indian / Asian evaluators |
| **Branch** | `fix/ci-post-merge-repair` | Canonical verified branch |
| **Root Directory** | *(Leave empty)* | Root of repository |
| **Runtime** | `Python 3` | Controlled by `.python-version` |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` | Installs pinned Python dependencies |
| **Start Command** | `uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT --workers 1` | Verified module path and single worker |
| **Health Check Path** | `/api/v1/health` | Returns HTTP 200 within 2 seconds |
| **Auto-Deploy** | `Yes` | Automatically redeploys on new push |

### Environment Variables for Backend Web Service:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.12.8` | Enforces Python 3.12.8 to prevent cp314 fallback |
| `APP_ENV` | `development` | Enables standalone lab mode (local CAS + in-memory store) |
| `DEBUG` | `false` | Disables debug tracebacks for security |
| `SECRET_KEY` | *(Generate 32-char hex string)* | E.g. `openssl rand -hex 32` or click "Generate" |
| `STORAGE_BACKEND` | `filesystem` | Directs CAS evidence to local ephemeral disk |
| `ALLOWED_ORIGINS` | `https://*.onrender.com,http://localhost:5173,http://localhost:3000` | Permits CORS for Render frontend |
| `PORT` | `10000` | Injected automatically by Render at runtime |

---

## 2. FRONTEND STATIC SITE SETTINGS (`tarka-frontend`)

Configure these values in the **Render Dashboard > Static Site > Settings**:

| Setting | Exact Value to Enter | Notes |
| :--- | :--- | :--- |
| **Name** | `tarka-frontend` | Subdomain: `https://tarka-frontend.onrender.com` |
| **Region** | `Singapore (Southeast Asia)` | Global CDN automatically activated |
| **Branch** | `fix/ci-post-merge-repair` | Canonical verified branch |
| **Root Directory** | *(Leave empty)* | Root of repository |
| **Build Command** | `cd frontend && npm install && npm run build` | Builds Vite React 18 production bundle |
| **Publish Directory** | `frontend/dist` | Contains compiled static assets |
| **Auto-Deploy** | `Yes` | Automatically redeploys on new push |

### Environment Variables for Frontend:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://tarka-backend.onrender.com` | Point to your backend Render URL |

### Rewrites / Routing for Single Page App (SPA):
In the **Redirects / Rewrites** tab:
- **Type:** `Rewrite`
- **Source:** `/*`
- **Destination:** `/index.html`
*(This ensures page refreshes on `/cases/CASE-2026-001` route cleanly to `index.html`)*
