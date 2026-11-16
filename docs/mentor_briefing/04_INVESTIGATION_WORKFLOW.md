# TARKA: END-TO-END INVESTIGATION WORKFLOW
**Step-by-Step Evidentiary Lifecycle from FIR Ingestion to Courtroom Admissibility**  
**Repository Working Directory:** `C:\PROJECTS\tarka_v5_clean_verify`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Audience:** Forensic Examiners, Investigating Officers, Academic Mentors  

---

## INVESTIGATION LIFECYCLE SUMMARY TABLE

The table below details all 16 consecutive stages of a complete cyber-fraud investigation conducted inside TARKA:

| Stage | Name | Input | Processing Method | Output | Responsible Module | Implementation Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **01** | **Case Creation** | FIR details, complainant name, ack number, jurisdiction | Allocates workspace, sets case boundaries, creates directory | Case ID record (`case.json`), active workspace | `backend/tarka/core/evidence_dna.py`<br/>`NewCaseModal.tsx` | **FULLY IMPLEMENTED** |
| **02** | **Evidence Acquisition** | Raw digital files (CSV, PDF, XML, TXT, PCAP) | Multipart upload stream, MIME type validation, sanitation | Ingested file buffer, raw byte stream | `evidence_dna.py`<br/>`EvidenceIntakeModal.tsx` | **FULLY IMPLEMENTED** |
| **03** | **Evidence Hashing** | Raw file bytes | Computes cryptographic SHA-256 digest, BIP-39 mnemonic | Immutable CAS key, BIP-39 words, PGP phonetic words | `forensicCrypto.ts`<br/>`evidence_dna.py` | **FULLY IMPLEMENTED** |
| **04** | **Evidence Admission** | Stored CAS artifact | GateRail evaluation (I1 format, I2 crypto, I3 time, I4 link, I5 law) | Gate qualification pass or quarantine flag | `GateRail.tsx`<br/>`intakeFalsifier.ts` | **FULLY IMPLEMENTED** |
| **05** | **Metadata Extraction** | Admitted files | PDF trailer scan, CSV header inspection, XML schema validation | File metadata, creation dates, software signatures | `intakeFalsifier.ts`<br/>`source_adapters.py` | **FULLY IMPLEMENTED** |
| **06** | **Data Normalization** | Heterogeneous records | Converts CBS, IPDR, and CDR entries into canonical fact objects | Normalized fact schema (`TransactionalFact`, `NetworkFact`) | `source_adapters.py`<br/>`evidence_dna.py` | **FULLY IMPLEMENTED** |
| **07** | **Entity Identification**| Normalized facts | Extracts PAN, Aadhaar (blinded), MSISDN, IMEI, VPA, Bank ACC | Candidate entity nodes, token sets | `EntityResolutionScreen.tsx`<br/>`analysis_run.py` | **FULLY IMPLEMENTED** |
| **08** | **Tx Reconstruction** | Bank transaction facts | Reconstructs ledger chronologically, calculates running balances | Verified double-entry ledger, running balances | `FinacleLedgerReconstructor.tsx`<br/>`intakeFalsifier.ts` | **FULLY IMPLEMENTED** |
| **09** | **Temporal Analysis** | Multi-source timestamps | Normalizes UTC/IST, detects clock drift, aligns multi-track loom | Compensated chronological timeline | `timeline_reconstruction.py`<br/>`TemporalEvidenceLoom.tsx` | **FULLY IMPLEMENTED** |
| **10** | **Graph Correlation** | Entities & transactions | Projects nodes/edges into graph, detects diamond loops, TTL=63 | Interactive syndicate network graph | `FraudNetworkScreen.tsx`<br/>`ForceSimulationEngine.ts` | **FULLY IMPLEMENTED** |
| **11** | **Claim Generation** | Graph patterns & anomalies | AI algorithmic engine proposes suspect mule clusters and paths | Structured investigative hypotheses | `ClaimInspector.tsx`<br/>`analysis_run.py` | **FULLY IMPLEMENTED** |
| **12** | **Contradiction Check**| Hypotheses & raw facts | Evaluates Hard-Veto rule, verifies conflicting statutory tokens | Quarantined claims, contradiction alerts | `EntityResolutionScreen.tsx`<br/>`test_phase5c_contradictions.py`| **FULLY IMPLEMENTED** |
| **13** | **Constraint Verification**| Financial & temporal flows | Microsoft Z3 SMT solver proves satisfiability and conservation | Mathematical SAT proof or exact MUS discrepancy | `formal_verification.py`<br/>`test_ps04_formal_verification.py`| **FULLY IMPLEMENTED** |
| **14** | **Human Review** | Verified hypotheses | Investigating Officer reviews evidence, approves or rejects leads | Legally binding attribution decision | `ClaimInspector.tsx`<br/>`TarkaGlobalShell.tsx` | **FULLY IMPLEMENTED** |
| **15** | **Report Generation** | Case facts & verified claims | Compiles Section 63 BSA certificate, Part-B custody, PDF | Court-admissible binary `%PDF-1.4`, JSON dossier | `CourtProofScreen.tsx`<br/>`test_phase8_forensic_reports.py` | **FULLY IMPLEMENTED** |
| **16** | **Audit & Reproducibility**| Complete case session | Chains event hashes in flight recorder, logs session receipt | Cryptographically sealed JSONL flight log | `InvestigationFlightRecorder.tsx`<br/>`reproduce.ps1` | **FULLY IMPLEMENTED** |

---

## DETAILED NARRATIVE: THE LIFE OF AN EVIDENCE ARTIFACT

To demonstrate how the workbench enforces evidentiary integrity from start to finish, consider the journey of an SBI Finacle core banking extract (`sbi_finacle_cbs.csv`):

### Phase 1: Intake & Nonce Hashing
1. An investigator receives an official bank extract from the State Bank of India nodal officer.
2. The file is uploaded through `EvidenceIntakeModal`.
3. The Evidence DNA engine reads the byte stream into memory, computes its SHA-256 digest (`ffb3983d...`), derives its 6-word BIP-39 mnemonic (`vintage velvet orbit...`), and writes the raw bytes to `storage/cas/ffb3983d...`.
4. If an identical extract is re-uploaded, the system recognizes the digest, avoids storage duplication, and references the original record.

### Phase 2: Qualification & Falsification Testing
1. The file enters GateRail at **Gate I1 (Format)**: CSV structure is verified, and row separators are validated.
2. It proceeds to **Gate I2 (Cryptography)**: Bitstream check confirms the stored CAS hash matches the acquisition hash (`BITSTREAM_INTACT`).
3. At **Gate I3 (Monotonicity)**: Transaction timestamps are checked for non-decreasing order.
4. If an evaluator uses the Mutator to alter Row #14 balance from ₹5,22,440.00 to ₹3,22,440.00:
   - Double-entry checking fails:
     $$\Delta \text{Balance} \neq \text{Credit} - \text{Debit}$$
   - The ledger card flashes a red ₹2,00,000 deficit warning.
   - Gates I1 and I3 immediately trip to `HALTED`, preventing tainted data from proceeding.

### Phase 3: Cross-Source Join & Formal Proof
1. In the clean state, the Finacle statement is joined with Airtel IPDR logs, NPCI switch XML records, and victim mobile dumps.
2. The Z3 SMT solver receives the financial transfer equations:
   $$x_{Victim} = 50,000 \implies y_{Mule1} + y_{Mule2} = 35,000 + 15,000$$
3. Z3 solves the formula in 3.2 milliseconds, proving satisfiability with certified discrepancy of ₹0.00.
4. Downstream, the CGNAT engine correlates the IPDR source port `49152` at microsecond `10:14:22.109` against the carrier translation table, narrowing 340 mobile subscribers down to 1 specific subscriber.

### Phase 4: Human Decision & Judicial Certification
1. The AI engine synthesizes these facts and *proposes* that Mule Account `ACC-MULE-4411` received the primary ₹35,000 disbursement.
2. The Investigating Officer reviews the proposal in the `ClaimInspector`, confirms the supporting SHA-256 hashes, and clicks **Authorize Lien**.
3. The Flight Recorder appends the IO's action into the immutable audit ledger.
4. The system compiles the **Section 63(4) Bharatiya Sakshya Adhiniyam, 2023** certificate, attaching the Merkle root seal, and exports a court-ready binary PDF ready for filing before the Chief Judicial Magistrate.

