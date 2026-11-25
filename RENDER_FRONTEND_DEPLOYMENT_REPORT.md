# TARKA × SENTINELX — RENDER FRONTEND DEPLOYMENT REPORT
**Platform:** Render Static Site (Free Tier)  
**Target Repository:** `https://github.com/Massvippin01/tarka_v5.git`  
**Branch:** `fix/ci-post-merge-repair`  
**Target Region:** Singapore (Southeast Asia)  
**Hosting Budget:** ₹0 (Zero-Cost Production Blueprint)  
**Backend Public Endpoint:** `https://tarka-v5-1.onrender.com`  
**Frontend Deployment Method:** Render Static Site  
**Build Command:** `cd frontend && npm install && npm run build`  
**Publish Directory:** `frontend/dist`  

---

## 1. Executive Summary

This report documents the production-hardening and deployment preparation of the TARKA × SENTINELX frontend as a zero-cost, high-performance static web application on Render Static Sites, connected to the live FastAPI backend already operating at `https://tarka-v5-1.onrender.com`.

The frontend architecture strictly preserves the founder-approved V6 tactile skeuomorphic design language (warm ivory palette `#F8F4ED`, `#E9E2D7`, dark charcoal typography `#221C19`, burnt amber highlights `#A85C2A`, physical card elevations, and custom scrollbars) without modifying visual tokens or altering application workflows.

---

## 2. Infrastructure Configuration

### 2.1 Render Static Site Specifications
- **Service Type:** Static Site (`runtime: static`)
- **Plan:** Free Tier (₹0/month)
- **Global Edge CDN:** Automatically distributed and cached across Render's global edge network.
- **Root Directory:** Repository root (`.`) or `frontend`
- **Build Command:** `cd frontend && npm install && npm run build`
- **Publish Directory:** `frontend/dist`
- **Environment Variable:**
  - `VITE_API_URL`: `https://tarka-v5-1.onrender.com`

### 2.2 Single-Page Application (SPA) Routing & Fallback
Because TARKA is a client-side Single-Page Application with deep state parameters and sub-routes, direct navigation or page refresh would result in HTTP 404 errors if the static server attempts to locate non-existent HTML files.

To guarantee zero 404 routing failures:
1. **Render `_redirects` Rule:**
   Created `frontend/public/_redirects` which Vite copies directly into `frontend/dist/_redirects` during compilation:
   ```text
   /*    /index.html   200
   ```
2. **Render Blueprint (`render.yaml`):**
   ```yaml
   routes:
     - type: rewrite
       source: /*
       destination: /index.html
   ```

---

## 3. Production Build & Bundle Audit

### 3.1 Build Command Execution
- Command: `tsc -b && vite build`
- Build Duration: 4.65 seconds
- TypeScript Compilation: 0 errors
- Modules Transformed: 1,782 modules

### 3.2 Rollup Chunk Distribution
The build outputs optimized chunks strategically partitioned to minimize initial page load latency and isolate heavy dependencies:

| Asset Name | Uncompressed Size | Gzip Size | Role / Description |
|---|---|---|---|
| `vendor-react-*.js` | 1,019.50 kB | 286.09 kB | React 19 core, scheduler, DOM runtimes |
| `vendor-echarts-*.js` | 1,118.59 kB | 371.05 kB | ECharts & ZRender visualization engine |
| `index-*.js` | 1,178.98 kB | 295.30 kB | Core application shell & common components |
| `EvidenceFileManager-*.js` | 111.68 kB | 24.96 kB | Evidence intake, validation & flight recorder |
| `CrossStateWaterfall-*.js` | 96.21 kB | 21.95 kB | Multi-bank money trail waterfall graph |
| `BenchmarkLabScreen-*.js` | 76.54 kB | 20.15 kB | Automated 10k-row benchmark lab suite |
| `ReportScreen-*.js` | 71.92 kB | 17.28 kB | Statutory Section 63/65B court evidence export |
| `bulkIngestion.worker-*.js` | 1.47 kB | 0.69 kB | Background web worker for SHA-256 chunk hashing |
| `index.html` | 1.64 kB | 0.69 kB | Application entry HTML shell |

### 3.3 Security & Secret Audit
- No backend API secret keys, database credentials, or server-side tokens exist in `frontend/dist/`.
- All client-side environment variables are strictly scoped to the public `VITE_` prefix (`VITE_API_URL`).
- All cryptographic proofs generated in the browser utilize browser-native WebCrypto (`crypto.subtle.digest("SHA-256")`).

---

## 4. Render Dashboard Setup Guide

To deploy this static frontend through the Render Web Console:

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Static Site**.
3. Connect repository: `Massvippin01/tarka_v5`.
4. Configure the deployment settings:
   - **Name:** `tarka-frontend`
   - **Branch:** `fix/ci-post-merge-repair`
   - **Root Directory:** Leave blank (or enter repository root)
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/dist`
5. Under **Environment Variables**, add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://tarka-v5-1.onrender.com`
6. Click **Create Static Site**.
7. Once deployed, the frontend URL (e.g. `https://tarka-frontend.onrender.com`) is immediately active and connected to the live backend.
