# TARKA × SENTINELX — RENDER DEMO ENVIRONMENT LIMITATIONS

**Report Identifier:** `RENDER_DEMO_LIMITATIONS.md`  
**Purpose:** Honest Institutional Disclosure of Evaluator Tier Constraints  
**Deployment Class:** Public Evaluator Demonstration (Render Free Tier — ₹0 Budget)  
**Date:** 2026-11-25  

---

## 1. INFRASTRUCTURE RESOURCE BOUNDARIES

Render Free is designed for evaluation, demonstration, and staging verification, not heavy institutional workloads:

| Resource Dimension | Render Free Web Service | Production On-Premise / Cloud Baseline |
| :--- | :--- | :--- |
| **Compute Power** | 0.1 shared vCPU | 4.0 dedicated vCPUs (limit) / 2.0 (res) |
| **Random Access Memory** | **512 MB RAM** | **16 GB to 32 GB RAM** |
| **Persistent Storage** | **Ephemeral Disk (Wiped on spin-down)** | Persistent NVMe named volumes (`pg_prod_data`, `cas`) |
| **Service Inactivity** | Spins down after 15 mins of idle time | 24/7/365 active with hot standby and auto-scaling |
| **Cold Start Wakeup** | ~40 to 60 seconds on first request | Sub-millisecond (always active) |
| **Financial Cost** | **₹0 / month** | Standard cloud hosting or institutional server |

---

## 2. FUNCTIONAL CAPABILITIES IN THE DEMO ENVIRONMENT

### 2.1 Fully Operational Capabilities
- **Command Dashboard:** Live monitoring, Golden Hour countdown timers, and active exposure across 4 high syndicates.
- **Dossier & Case Exploration:** Full inspection of seed cases (`CASE-2026-001: Sunil Kumar`, `CASE-2026-002: Dr. Meera Nair`).
- **TRACE Financial Reconciliation:** Real-time double-entry ledger parsing across UPI, IMPS, NEFT, and RTGS with mathematical proof display.
- **AEGIS Syndicate Graph:** Multi-hop graph exploration, mule probability score calculations, and layer-1 through layer-4 transaction paths.
- **Epistemic Intelligence:** Hypothesis tracking, contradiction preservation, and passive data injection barriers.
- **BSA Section 63 Court Filing:** Cryptographic Merkle tree calculation and judicial report preview.

### 2.2 Demo-Only Limitations & Throttling
1. **Volumetric Evidence Uploads:** Multi-gigabyte disk images (e.g. 1 GB – 10 GB) cannot be uploaded on Render Free due to the 512 MB memory boundary and ephemeral disk quotas. Demonstration uploads should use statements and screenshots under **25 MB**.
2. **Deep OCR Engine:** Due to the absence of a GPU and the 512 MB memory ceiling, heavy deep learning OCR models are replaced by heuristic OCR triage and normalized text extraction.
3. **Data Ephemerality:** Any new cases created or files uploaded during an evaluator session will persist for the duration of the active container session. When the container spins down due to 15 minutes of inactivity, the database resets to the canonical seed baseline on the next request.
4. **Initial Cold Start:** When opening the public demo URL after an inactive period, the browser may take 45–60 seconds while Render spins up the container. Once awake, response times return to sub-second speeds.

---

## 3. SUMMARY DISCLOSURE
This deployment provides evaluators with a 100% genuine interactive experience of TARKA’s architecture, algorithms, and interface at zero hosting cost. For volumetric multi-gigabyte ingestion, durable multi-year evidence custody, and 24/7 continuous operation, refer to the full containerized production deployment outlined in `PHASE19_DEPLOYMENT_ARCHITECTURE.md`.
