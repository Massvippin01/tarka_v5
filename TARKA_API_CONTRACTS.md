# TARKA — API CONTRACTS & OPENAPI SPECIFICATION
## Authoritative REST & Streaming Endpoint Contracts

**Document Version:** 1.0.0-PROD  
**Authority:** API Platform Architect  
**Base URL:** `/api/v1`  
**Authentication:** `Bearer <HMAC-SHA256-JWT>`

---

## 1. EVIDENCE & INTAKE APIS

### `POST /api/v1/evidence/upload`
Uploads raw evidence byte stream into Content-Addressed Storage.
- **Headers:** `Content-Type: multipart/form-data`, `Authorization: Bearer <TOKEN>`
- **Request Body:**
  - `file`: binary byte stream
  - `case_id`: string (UUID or case slug)
  - `source_type`: `BANK_STATEMENT` | `TELECOM_CDR` | `WHATSAPP_CHAT` | `EXIF_IMAGE`
- **Response (HTTP 201 Created):**
  ```json
  {
    "artifact_id": "018f6e7c-8820-7b22-944d-1a82f09ef541",
    "case_id": "upi_payment_discrepancy",
    "filename": "axis_bank_statement.pdf",
    "sha256": "8a35b1d5c7f893e12a4b86c2d113e54b6789ab9876543210abcdef0123456789",
    "byte_size": 245892,
    "cas_uri": "cas://sha256/8a35b1d5c7f893e12a4b86c2d113e54b6789ab9876543210abcdef0123456789",
    "status": "ADMITTED"
  }
  ```

---

## 2. TARKA FORENSICS & VERIFICATION APIS

### `GET /api/v1/forensics/health`
Health and solver status endpoint.
- **Response (HTTP 200 OK):**
  ```json
  {
    "status": "healthy",
    "engine": "TARKA Digital Forensics Engine",
    "solver": "Z3 SMT v5.1.0",
    "storage": "Content-Addressed Storage (Dual Mode)"
  }
  ```

### `GET /api/v1/forensics/cases/{case_id}/summary`
Retrieves comprehensive forensic summary for an active case.
- **Response (HTTP 200 OK):**
  ```json
  {
    "case_id": "upi_payment_discrepancy",
    "artifacts_count": 4,
    "canonical_facts_count": 28,
    "contradictions_count": 1,
    "contradictions": [
      {
        "finding_id": "Finding-02",
        "conflict_type": "AMOUNT_DISCREPANCY",
        "severity": "CRITICAL",
        "plain_language_explanation": "Transaction RRN 202602148891 shows a ₹25,000 debit in bank records, but the disputed screenshot claims ₹15,000.",
        "conflicting_artifacts": ["art_bank_statement_cbs", "art_disputed_screenshot"],
        "conflicting_facts": ["fact_cbs_debit_25k", "fact_screenshot_claim_15k"]
      }
    ],
    "provenance_dag_nodes": 42,
    "provenance_dag_edges": 68
  }
  ```

### `POST /api/v1/forensics/cases/{case_id}/challenge`
Runs counterfactual re-solving by excluding specific artifacts.
- **Request Body:**
  ```json
  {
    "baseline_run_id": "run-20261020-001",
    "excluded_artifact_ids": ["art_disputed_screenshot"]
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "case_id": "upi_payment_discrepancy",
    "original_findings_count": 1,
    "new_findings_count": 0,
    "dissolved_findings": ["Finding-02"],
    "counterfactual_status": "CONTRADICTION_DISSOLVED",
    "explanation": "Excluding the disputed screenshot resolves the SMT contradiction, leaving the ₹25,000 bank record as uncontested truth."
  }
  ```

---

## 3. STATUTORY REPORT APIS

### `POST /api/v1/forensics/cases/{case_id}/report`
Generates an official Section 63 BSA legal report.
- **Request Body:**
  ```json
  {
    "examiner_name": "Senior Investigator Delhi Cyber Lab",
    "notes": "Verified against Core Banking System logs and Telecom CDR.",
    "include_dag": true
  }
  ```
- **Response (HTTP 201 Created):**
  ```json
  {
    "report_id": "BSA-63-2026-DEL-0091",
    "case_id": "upi_payment_discrepancy",
    "substantive_sha256": "4b6c2d113e54b6789ab9876543210abcdef01234567898a35b1d5c7f893e12a",
    "pdf_download_url": "/api/v1/forensics/reports/BSA-63-2026-DEL-0091/pdf",
    "status": "SEALED"
  }
  ```

---

## 4. AMBIENT VOICE & INTERACTION APIS

### `POST /api/v1/voice/turn`
Processes natural investigator spoken audio or transcribed text turn.
- **Request Body:**
  ```json
  {
    "case_id": "upi_payment_discrepancy",
    "transcript": "Show me the contradictions in this case",
    "language": "en-IN"
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "display_text": "I found 1 critical contradiction: Transaction RRN 202602148891 shows ₹25,000 in bank logs but ₹15,000 on the screenshot.",
    "spoken_text": "I found one critical contradiction regarding transaction R-R-N 202602148891. Bank records show 25 thousand rupees, while the receipt shows 15 thousand.",
    "ui_action": {
      "action_type": "NAVIGATE_TO_VIEW",
      "target_tab": "contradictions"
    }
  }
  ```

---

## 5. PHASE 10: MULTIMODAL FORENSICS & REAL-TIME STREAMING APIS

### `POST /api/v1/forensics/cases/{case_id}/evidence/multimodal-upload`
Submits multiple heterogeneous evidence files into the case with pre-admit security checks and kicks off background orchestration.
- **Request:** `multipart/form-data` with `files` list.
- **Response (HTTP 202 Accepted):**
  ```json
  {
    "status": "ACCEPTED",
    "job_id": "job-f8a19b2c",
    "case_id": "case-phase10-001",
    "admitted_artifacts": [
      { "artifact_id": "ART-001", "filename": "gpay_screenshot.png", "sha256": "...", "status": "ADMITTED" }
    ],
    "fsm_state": "RECEIVED",
    "sse_stream_url": "/api/v1/forensics/cases/case-phase10-001/events/stream"
  }
  ```

### `GET /api/v1/forensics/cases/{case_id}/jobs/{job_id}`
Retrieves current FSM state, progress percentage, and stage details for an asynchronous job.
- **Response (HTTP 200 OK):**
  ```json
  {
    "job_id": "job-f8a19b2c",
    "case_id": "case-phase10-001",
    "state": "PROCESSING",
    "progress_percent": 65,
    "current_stage": "ANALYSING_ELA_HEATMAP",
    "created_at_iso": "2026-11-23T05:40:00Z",
    "artifact_ids": ["ART-001"]
  }
  ```

### `POST /api/v1/forensics/cases/{case_id}/jobs/{job_id}/cancel`
Requests cancellation of an in-flight background job.
- **Response (HTTP 200 OK):**
  ```json
  { "status": "CANCEL_REQUESTED", "job_id": "job-f8a19b2c" }
  ```

### `GET /api/v1/forensics/cases/{case_id}/events/stream`
Server-Sent Events (SSE) live connection emitting real-time progress updates without polling.
- **Headers:** `Accept: text/event-stream`
- **Events:** `job_progress`, `job_completed`, `job_failed`, `keep_alive`

### `GET /api/v1/forensics/cases/{case_id}/artifacts/{artifact_id}/examination`
Retrieves modular visual examination results (ELA Q=90 heatmap, resampling scores, extracted OCR fields, typography analysis).
- **Response (HTTP 200 OK):**
  ```json
  {
    "artifact_id": "ART-001",
    "composite_anomaly_score": 0.58,
    "preliminary_assessment": "POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES",
    "human_verified": false,
    "conclusive": false,
    "modules": { ... }
  }
  ```

### `GET /api/v1/forensics/cases/{case_id}/hypotheses`
Retrieves Analysis of Competing Hypotheses (ACH matrix) and prioritized evidence gaps under Indian statutory powers.
- **Response (HTTP 200 OK):**
  ```json
  {
    "case_id": "case-phase10-001",
    "competing_hypotheses": [
      { "id": "H1", "title": "Digital Alteration", "score": 0.72 },
      { "id": "H2", "title": "Split Transaction Sequence", "score": 0.40 },
      { "id": "H3", "title": "Account Takeover", "score": 0.35 }
    ],
    "evidence_gaps": [
      { "gap_id": "GAP-01", "description": "Obtain CBS statement", "statutory_power": "Section 94 BNSS", "priority": 1.45 }
    ]
  }
  ```
