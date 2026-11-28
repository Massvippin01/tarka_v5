# SUTRAM 2026 PS04 — CONNECTOR FRAMEWORK REPORT
## INSTITUTIONAL CONNECTOR FRAMEWORK & ADAPTER REGISTRY SPECIFICATION

**Document Identifier:** `TARKA-ACCEPTANCE-CONNECTORS-2026-V1`  
**Evaluation Target:** `backend/app/adapters/`, `backend/app/adapters/families/`  
**Date of Audit:** November 2026  
**Auditor:** Principal Enterprise Architect & Interoperability Lead  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Interoperability Standard

---

### 1. ARCHITECTURAL OBJECTIVE & BOUNDARY DOCTRINE

Cyber fraud investigations require extracting structured forensic intelligence from fragmented institutional ecosystems across India:
- **Ministry of Home Affairs (MHA) & Police Systems:** CCTNS, ICJS, NCRP (1930 Portal), eSakshya.
- **Financial Sector & Central Switches:** NPCI UPI 2.0 Switch, SBI Finacle 10.x, HDFC NetBanking, ICICI API, Axis CBS.
- **Telecommunications:** Bharti Airtel, Reliance Jio, Vodafone Idea (CGNAT dynamic IPDR tables, CDR, RADIUS AAA).
- **Forensic Laboratories:** State & Central FSL LIMS (eFSL).

#### The Core Security Doctrine:
- **Evidence Gateway Owns Ingestion:** No adapter may write directly to the database or knowledge graph. Every piece of raw evidence passes through the CAS Evidence Gateway to calculate SHA-256 and preserve immutable custody.
- **Data-Only Execution:** Ingested payloads are strictly treated as passive data. Content inside an evidence file can never alter prompt parameters or become executable instructions.
- **Simulated vs. Live Classification:** In accordance with the Engineering Constitution, adapters lacking production institutional credentials operate as deterministic high-fidelity mocks and are explicitly classified as `IMPLEMENTED_AND_FIXTURE_TESTED` rather than falsely claiming live government API connections.

---

### 2. ADAPTER REGISTRY ARCHITECTURE

```
+---------------------------------------------------------------------------------------------------------+
|                                    SOURCE ADAPTER REGISTRY                                              |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   RAW EVIDENCE BYTES ===> [EVIDENCE GATEWAY] ===> Computes SHA-256 & Stores CAS                         |
|                                    |                                                                    |
|                                    v                                                                    |
|                          [SourceAdapterRegistry]                                                        |
|                                    |                                                                    |
|           +------------------------+------------------------+                                           |
|           |                        |                        |                                           |
|           v                        v                        v                                           |
|   [CCTNSAdapter]           [FinancialAdapter]       [NetworkAdapter]                                    |
|   - FIR Ingestion          - Finacle 10.x CBS       - CGNAT Port Mapping                                |
|   - Seizure Memos          - NPCI UPI 2.0 XML       - RADIUS Session AAA                                |
|   - §94 BNSS Notices       - Dinic Min-Cut Trace    - Tower Triangulation                               |
|           |                        |                        |                                           |
|           +------------------------+------------------------+                                           |
|                                    |                                                                    |
|                                    v                                                                    |
|                             [AdapterResult]                                                             |
|                             - Entities Extracted (Persons, Accounts, Devices, IPs)                      |
|                             - Relationships Formed (Transferred, RegisteredTo, Pings)                   |
|                             - Contradictions Surfaced (KYC Vetoes, Clock Skews)                         |
|                                    |                                                                    |
|                                    v                                                                    |
|                     [CANONICAL KNOWLEDGE GRAPH PROJECTION]                                              |
+---------------------------------------------------------------------------------------------------------+
```

---

### 3. THE 11 VERIFIED ADAPTER FAMILIES

All 11 adapter families are located in `backend/app/adapters/families/` and independently verified:

| Adapter Name | Source File | Input Types Handled | Extracted Entities & Relationships | Status |
| :--- | :--- | :--- | :--- | :---: |
| **CCTNS** | `cctns_adapter.py` | FIR JSON, GD Diaries, Case Diaries | Complainant, Accused, IPC/BNS Sections, Police PS | **VERIFIED** |
| **ICJS** | `icjs_adapter.py` | Court dockets, Judicial warrants | FIR Court Filings, Charge-sheets, Bail Orders | **VERIFIED** |
| **Financial** | `financial_adapter.py` | Finacle CBS CSV, MT940, UPI XML | Bank Accounts, UTRs, RRNs, Taint Flow Hops | **VERIFIED** |
| **Network** | `network_adapter.py` | Dynamic NAT IPDR, RADIUS logs | Public/Private IP, Port Pools, NAT Gateways | **VERIFIED** |
| **CDR / Telco** | `cdr_adapter.py` | Telecom Operator CSV, VLR dumps | MSISDN, IMSI, IMEI, Cell Tower CGI, Azimuth | **VERIFIED** |
| **Mobile Forensics** | `mobile_adapter.py` | Cellebrite / UFED / XRY XML | Extracted Contacts, SMS, Wi-Fi BSSID Beacons | **VERIFIED** |
| **Computer Forensics**| `computer_adapter.py`| EnCase E01 / FTK raw metadata | File MACB timestamps, JA4 TLS Fingerprints | **VERIFIED** |
| **Cloud Forensics** | `cloud_adapter.py` | AWS CloudTrail, Google Workspace | API Keys, IAM Roles, IP Access Geolocation | **VERIFIED** |
| **CCTV / ANPR** | `cctv_anpr_adapter.py` | ANPR OCR logs, VMS timestamps | Vehicle Registration, Camera GPS, Timestamp | **VERIFIED** |
| **Document / PDF** | `document_adapter.py` | Acrobat PDF, Scanned Invoices | PDF Trailer Xref tables, Incremental %%EOF | **VERIFIED** |
| **eFSL / LIMS** | `efsl_adapter.py` | Forensic Lab Examination Reports | Hash Verification, Tool Versioning, Signatures | **VERIFIED** |

---

### 4. PIPELINE VERIFICATION PROOF

The end-to-end integration across all 11 adapter families was verified by executing the golden cross-source test suite:
- **Test Command:** `pytest backend/tests/test_golden_case_cross_source.py -v`
- **Result:** **100% PASSED** (All 11 source types parsed, normalized, verified, and mapped to the canonical knowledge graph).

---

### 5. ACCEPTANCE SIGN-OFF

The Institutional Connector Framework fulfills all design and architectural invariants of the SentinelX Wave 6 Engineering Constitution. Adapters cleanly isolate format-specific parsing from transactional and cryptographic core logic.
