# TARKA × SENTINELX — PHASE 17 TRACE FINANCIAL FORENSICS ACCEPTANCE

**Audit Date**: 2026-11-25  
**Component**: TRACE Financial Transaction & Forensics Engine  
**Governing Standard**: *AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.*

---

## 1. Evidentiary Ingestion to Financial Findings Lineage

The TRACE engine proves an unbroken, mathematical lineage from raw evidence bytes to adjudicable forensic findings:

```
RAW BITSTREAMS (PNG Screenshots, Core Banking CSV/PDF Ledgers)
       │
       ▼
CONTENT-ADDRESSED STORAGE (SHA-256 Bitstream Hash)
       │
       ▼
PARSING & OCR (FormatParserRegistry + RapidOCROnnxEngine)
       │
       ▼
PERSISTENT OBSERVATIONS (case_dir/observations/observations.json)
       │
       ▼
CANONICAL UCM NORMALIZATION (Transactions, Accounts, RRNs)
       │
       ▼
DOUBLE-ENTRY RECONCILIATION & BALANCE CONSERVATION
       │
       ▼
TRACE FINDINGS (Discrepancies, Splicing Hotspots, Kerning Anomaly)
```

---

## 2. Test Execution & Reconciliation Evidence

Verified in `backend/tests/test_tarka_e2e_investigation_workflow.py` (`test_03_trace_financial_reconciliation`):

### 2.1 Discrepancy Isolation (₹450 Delta)
- **Claimed Voucher / Payment Screenshot**: RRN `202602148891` indicates ₹15,000.00.
- **Core Banking Statement (CBS)**: Account debited ₹15,450.00 under RRN `202602148891`.
- **Reconciliation Finding**:
  - Discrepancy Amount: **₹450.00**
  - Finding Classification: `FINANCIAL_DISCREPANCY`
  - Statutory Severity: `HIGH`
  - Explanatory Rationale: Core Banking Statement records ₹15,450.00 against disputed screenshot claiming ₹15,000.00. Potential intermediary fee, hidden surcharge, or raster manipulation.

### 2.2 Double-Entry Mathematical Balance Conservation
Every ledger admitted into TRACE is audited against the fundamental accounting invariant:
$$\text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits} = \text{Closing Balance}$$
Any deviation $\Delta \ne 0$ is isolated as an ungrounded or manipulated transaction entry.

### 2.3 Comprehensive Forensic Attributes Tested
- **Amounts & Precision**: Stored as exact two-decimal floats and fixed-point currency representations (INR / ₹).
- **UTR / RRN Keys**: Validated 12-digit numeric strings (`^\d{12}$`) cross-referenced across switch logs and banking ledgers.
- **Reversals & Refunds**: Auto-reversal matching identifies temporary holding charges vs finalized debits.
- **Visual Tampering (ELA & Resampling)**: Error Level Analysis at Q=90 identifies 32×32 macroblock compression anomalies; periodic autocorrelation flags digital font splicing.
- **Zero Hardcoded Findings**: All findings are computed dynamically from parsed observation JSON files.
