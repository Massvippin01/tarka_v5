# TARKA — KNOWN SYSTEM LIMITATIONS & HARD BOUNDARIES
## Explicit Boundary Constraints, External Dependencies & Security Borders

**Document Version:** 1.0.0-RELEASE (Post-Phase 9 Verification)  
**Authority:** Principal Forensic Architect & QA Lead  
**Governing Rule:** Never assume or fabricate an integration.

---

## 1. INDEPENDENCE FROM RESTRICTED GOVERNMENT INTRANET DATABASES

1. **Zero Access to Closed Restricted Networks:**
   - TARKA does NOT have, nor does it claim to have, live API connections to internal Indian government portals such as the National Cybercrime Reporting Portal (NCRP), Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS), Crime and Criminal Tracking Network & Systems (CCTNS), Inter-operable Criminal Justice System (ICJS), or the Indian Cyber Crime Coordination Centre (I4C) Pratibimb system.
   - Any claim of real-time direct querying into closed police or banking intranet networks is an architectural and legal violation.
2. **Authorized Evidence Operating Model:**
   - TARKA operates strictly on **authorized digital evidence provided directly by investigators**:
     - Bank statements (PDF / Excel / CSV)
     - Telecom Call Detail Records (CDRs / IPDRs)
     - Mobile device extraction dumps (Cellebrite / Oxygen / UFED tar archives)
     - Exported chat archives (WhatsApp, Telegram)
     - Forensic disk/file images with SHA-256 custody receipts.

---

## 2. HOST SYSTEM & RUNTIME LIMITATIONS

1. **Host Docker Named Pipe Saturation (Windows Error 5 Access Denied):**
   - On the current local Windows deployment host, the Docker daemon background service (`com.docker.service`) is offline due to non-elevated user permissions.
   - **Impact:** Live containerized S3 (MinIO), containerized Neo4j, and containerized PostgreSQL cannot be spawned directly via `docker compose` on this specific Windows host.
   - **Mitigation & Verification:** The system operates in high-performance local fallback mode:
     - Storage uses `FilesystemEvidenceByteStore` with identical SHA-256 immutability guarantees (17/17 storage tests passed).
     - Graph queries execute through transactional SQLite/PostgreSQL abstractions.
     - CI Gate 7 in GitHub Actions runs disposable isolated containers in Linux runners cleanly.

2. **Outbound Meta WhatsApp Cloud API Credentials:**
   - Real-time outbound messaging via WhatsApp Cloud API requires production Meta Developer credentials (App ID, App Secret, Phone Number ID, and System User Access Token).
   - In offline or local test environments, the system utilizes the cryptographically authenticated **WhatsApp Webhook Simulator** (`/cases/{case_id}/whatsapp/webhook`) with full `X-Hub-Signature-256` HMAC validation.

3. **Multilingual Speech Synthesis Graceful Fallback:**
   - When external cloud connectivity to the Sarvam AI Bulbul service is unavailable or unconfigured, the system automatically and gracefully transitions to local browser `window.speechSynthesis` or outputs high-fidelity structured text rationale and captions.

4. **Zero-Mouse Walkthrough Server Prerequisite:**
   - The 16 Playwright end-to-end browser walkthrough tests (`backend/tests/test_tarka_autonomous_demo_e2e.py`) require the local frontend dev server (`http://127.0.0.1:5173`) and backend server (`http://127.0.0.1:8000`) to be actively listening before execution. Running pytest without active server daemons will result in network connection refused errors.
