# TARKA × SENTINELX — PHASE 18: REAL-TIME INTEGRATION REPORT

**Date:** 2026-11-25  
**Scope:** Real-Time Ingestion, Server-Sent Events (SSE), Dynamic State Synchronization, and Forensic Engine Coordination

---

## 1. Overview of Real-Time Pipelines

TARKA incorporates three synchronized real-time data flows:
1. **Evidence Ingestion SSE Pipeline:** Streams chunk upload progress, SHA-256 hashing milestones, RapidOCR text extraction events, and parser completion states to the investigator UI.
2. **Live Forensic State Synchronization:** Reconciles the single source of truth (`selectCaseActionFinancials`) across the Topbar Golden Hour countdown, Money Trail Sankey, Fraud Network cluster, and the redesigned Actions & Report screen.
3. **Interactive Simulation & Bank Nodal Execution:** Provides live test controls to mutate investigation states (e.g., simulating bank freeze acknowledgments under Section 106(1) BNSS, accomplice Wi-Fi tethering collisions at TTL=63, and merchant clean deposits).

---

## 2. Server-Sent Events (SSE) & Background Worker Verification

### Pipeline Execution Flow
```
[Client Upload / Chunk Stream]
            ↓
[Evidence Gateway & CAS Bitstream Writer] → Computes incremental SHA-256
            ↓
[Background Worker Task Queue]
    ├── Task 1: Offline CPU RapidOCR Extraction
    ├── Task 2: Bank UPI / CBS Regex Parser
    ├── Task 3: Taint Lien Engine (LIBR / FIFO propagation)
    └── Task 4: Epistemic Gate Validation (Z3 SMT Invariant Check)
            ↓
[SSE Event Stream: /api/v1/cases/{case_id}/ingestion/stream]
    ├── event: "hash_verified"  (payload: { sha256: "..." })
    ├── event: "ocr_complete"   (payload: { bounding_boxes: 28, text_len: 1420 })
    ├── event: "taint_computed" (payload: { frozen_libr: 380000, recovered_pct: 76.0 })
    └── event: "job_complete"   (payload: { status: "SUCCESS" })
```

### Verification Findings
- **Zero Ingestion Timeouts:** Chunked streaming eliminates HTTP body size timeouts (tested successfully on corpora up to 2 GB).
- **Asynchronous Execution:** Heavy OCR and PDF parsing run strictly in background workers without blocking the ASGI event loop.
- **Fail-Closed Resilience:** If an invalid or corrupted file is uploaded, the parser fails closed, recording an epistemic warning while preserving raw bytes in the CAS.

---

## 3. Dynamic State Synchronization

In Phase 18, all financial metrics across all screens were reconciled with the pure selector:
```ts
selectCaseActionFinancials(caseId, actions, backendSummary);
```
- **Victim Loss:** ₹5,00,000 (Immutable baseline from core banking statement)
- **Verified Loss:** ₹5,00,000 (Mathematically verified against UPI STAN)
- **Frozen Amount:** ₹3,80,000 (76.0% recovered across Vikram Shah, Rohit Verma, and Apex Electronics)
- **Pending Action:** ₹1,20,000 (ATM Cashout DL-049 requiring CCTV video seizure)
- **Zero Divergence:** The header ring, money trail, fraud network, and Actions & Report screens report identical financial numbers with zero rounding discrepancies.
