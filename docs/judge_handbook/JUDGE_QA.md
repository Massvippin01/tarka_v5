# TARKA | Judge Questions & Answers Handbook
## Comprehensive Defensibility Dossier for Competition Panels

Every answer adheres strictly to the core doctrine:
```
AI PROPOSES.
EVIDENCE VERIFIES.
HUMAN DECIDES.
```

---

## 1. Evidence Integrity & Cryptographic Admissibility

### Q1: How do you mathematically guarantee that admitted evidence was not altered or tampered with?
- **15-Second Answer**: Every file uploaded into TARKA is immediately hashed with SHA-256 upon arrival and written to an immutable, append-only evidence locker. If a single byte or metadata bit changes, its cryptographic digest breaks and the Section 63 BSA certificate is invalidated.
- **Deeper Technical Answer**: TARKA employs chunked streaming SHA-256 ingestion via the Evidence Gateway (`backend/app/services/ingestion/evidence_gateway.py`). The resulting digest is permanently anchored into an append-only cryptographic flight recorder. Raw bitstreams are stored with write-once permissions in local storage or S3-compatible object stores. Any read operation dynamically re-computes the hash; a mismatch raises a `CRITICAL_INTEGRITY_TAMPER` fault and immediately locks the case workspace.
- **Supporting Screen & Artifact**: Screen 09 (`09_evidence_integrity.png`), Section 63 BSA Court Certificate (`CourtProofScreen.tsx`), and automated test `forensicCrypto.test.ts`.

---

### Q2: What happens when two evidence sources directly contradict each other (e.g., Victim Statement vs Bank CBS)?
- **15-Second Answer**: TARKA never automatically "averages" or silently resolves contradictory evidence. It explicitly surfaces contradictions in the Discrepancy Matrix with urgent amber badges and flags the exact time/amount delta for human judicial inquiry.
- **Deeper Technical Answer**: The Forensic Claim Compiler parses both sources into formal propositions. The Discrepancy Detector compares them against mathematical invariants (e.g., Victim debit time $T_V$ vs Core Banking credit time $T_C$). If $T_C < T_V$ (money credited before claimed debit) or if amounts mismatch, the system flags a `TEMPORAL_CONTRADICTION` or `LEDGER_DELTA_DISCREPANCY`. Both raw statements are preserved verbatim in the Provenance DAG.
- **Supporting Screen & Artifact**: Screen 11 (`11_financial_ledger.png`), Discrepancy Matrix, and test `deriveGateVerdict.test.ts`.

---

### Q3: Can a defense attorney or auditor inspect every transformation applied to the raw data?
- **15-Second Answer**: Yes. Every single deduction, filter, and entity resolution is tracked in the Cryptographic Provenance DAG and the black-box Investigation Flight Recorder, making every finding 100% reproducible.
- **Deeper Technical Answer**: TARKA implements a Merkle-DAG lineage structure (`ProvenanceDAGView.tsx`). Each conclusion node contains pointers to parent transformation IDs, parsing algorithms, and raw bitstream SHA-256 hashes. The Investigation Flight Recorder (`InvestigationFlightRecorder.tsx`) records every officer keystroke, query, and tool execution into an immutable SHA-256 state chain compliant with ISO/IEC 27037 standards for digital evidence handling.
- **Supporting Screen & Artifact**: Screen 19 (`19_provenance_dag.png`) and Screen 20 (`20_investigation_flight_recorder.png`).

---

## 2. Artificial Intelligence, Hallucinations & Formal Verification

### Q4: Large Language Models are notorious for hallucinations. How do you prevent TARKA from hallucinating facts or suspects?
- **15-Second Answer**: In TARKA, AI models only *propose* hypotheses; they are never allowed to assert facts. Every proposed claim must be verified against admitted evidence hashes and validated through formal logic.
- **Deeper Technical Answer**: We decouple natural language generation from factual verification. The LLM acts solely as a semantic parser translating natural language queries into structured propositions. These propositions are passed to deterministic engines: the Double-Entry Balance Validator, the Chronology Validator, and the Z3 SMT Solver. If a claim lacks an explicit pointer to an admitted artifact hash, it is marked `UNGROUNDED` and highlighted in gray.
- **Supporting Screen & Artifact**: Screen 17 (`17_claim_compiler.png`) and Screen 18 (`18_claim_dependency_lens.png`).

---

### Q5: Does a Z3 SMT Solver result proving "SAT" mean the suspect is guilty?
- **15-Second Answer**: Absolutely not. Z3 only proves that the mathematical constraints and propositions encoded by the investigator are logically satisfiable and contradiction-free. Only a human judge determines guilt.
- **Deeper Technical Answer**: The Z3 Theorem Prover evaluates formal first-order logic constraints over financial flow conservation and temporal ordering:
  $$\text{SAT} \iff \exists \vec{x} \text{ such that } \Phi(\vec{x}) = \text{True}$$
  A result of `SAT` establishes internal logical consistency of the investigative theory. A result of `UNSAT` proves a formal contradiction in the claims, isolating the minimal `unsat_core` so investigators know which assumption is mathematically impossible.
- **Supporting Screen & Artifact**: Screen 18 (`18_claim_dependency_lens.png`) and test `crossScreenConsistency.test.ts`.

---

### Q6: How does TARKA distinguish mere correlation or graph proximity from genuine criminal causation?
- **15-Second Answer**: Proximity in a graph never equals guilt. TARKA strictly enforces temporal order, IP/device co-location, and double-entry money velocity before scoring syndicate participation.
- **Deeper Technical Answer**: Many innocent parties (e.g., merchants, relatives) appear adjacent to mule accounts. TARKA applies multi-dimensional filtering:
  1. **Temporal Precedence**: Did the incoming fraudulent funds directly trigger the outgoing transfer within the dissipation window ($< 15\text{ mins}$)?
  2. **Haircut Taint Velocity**: Did the account retain a laundering commission (10–15%) before forwarding?
  3. **Device Fingerprint Binding**: Was the transaction initiated from a handset sharing an IMEI/CGNAT pool with known syndicate operators?
  Guilt is never inferred from centrality alone; all candidate accounts require human officer confirmation.
- **Supporting Screen & Artifact**: Screen 15 (`15_fraud_network_graph.png`) and Screen 13 (`13_financial_reconstruction.png`).

---

## 3. Telecommunications & CGNAT Forensic Attribution

### Q7: Cyber criminals hide behind shared cellular IP addresses. How does TARKA avoid falsely implicating innocent mobile subscribers?
- **15-Second Answer**: TARKA never attributes guilt based on a public IP alone. It demultiplexes Carrier-Grade NAT (CGNAT) by correlating the public IP, the exact source port, and the microsecond UTC timestamp against ISP allocation logs.
- **Deeper Technical Answer**: Telecom operators (Jio, Airtel, Vi) assign one public IPv4 address to thousands of simultaneous mobile users. Attributing an IP without a port leads to false arrests. TARKA's CGNAT Demux Engine ingests the ISP RADIUS/NAT translation table and matches:
  $$\{\text{Public IPv4}, \text{Source Port}, \text{Timestamp}_{\text{UTC}} \pm \Delta t\} \longrightarrow \{\text{Private IP}, \text{IMSI}, \text{MSISDN}\}$$
  This pinpoints the exact physical subscriber and IMEI handset, exonerating other subscribers sharing that public IP.
- **Supporting Screen & Artifact**: Screen 21 (`21_falsification_gate.png`) and test `statutoryDirectives.test.ts`.

---

### Q8: How does the system handle timestamps recorded across different time zones or unsynchronized servers?
- **15-Second Answer**: The Temporal Evidence Loom normalizes all timestamps to standard UTC with microsecond precision and calculates clock drift across server logs.
- **Deeper Technical Answer**: The `TemporalEvidenceLoom` parses ISO 8601, RFC 2822, Epoch milliseconds, and Indian Standard Time (IST) strings. It detects clock skew by evaluating anchor events (e.g., an SMS OTP generation timestamp on the bank server vs the delivery receipt timestamp on the telco SMSC). It calculates linear clock drift $\delta(t) = \alpha t + \beta$ to realign disparate logs onto a synchronized chronological canvas.
- **Supporting Screen & Artifact**: Screen 14 (`14_temporal_evidence_loom.png`) and test `chronologyValidator.test.ts`.

---

## 4. Voice Processing, Sovereign Air-Gap & Privacy

### Q9: Is voice processing genuinely sovereign and capable of operating completely offline?
- **15-Second Answer**: Yes. In Sovereign Offline Mode, TARKA operates with zero cloud connections and enforces a strict **ZERO-TTS** policy—no unvetted spoken audio is generated, and responses are delivered visually.
- **Deeper Technical Answer**: When toggled to `OFFLINE_LOCAL` (via key `[O]`), the system shuts down external network sockets. Voice intent resolution executes locally inside the browser using AST token matching in `tarkaNavigationRegistry.ts`. In connected mode, it routes exclusively to sovereign Sarvam AI (Saaras v2 STT and Bulbul v1 TTS) hosted on Indian infrastructure. Web Speech API is explicitly disabled to prevent unmonitored telemetry leakage.
- **Supporting Screen & Artifact**: Screen 01 (`01_particle_home.png`), Screen 02 (`02_voice_interrogation.png`), and test `autonomousParticleVoiceAndNavigation.test.ts`.

---

### Q10: What sensitive investigative data is transmitted to Sarvam AI when connected?
- **15-Second Answer**: Only the user's spoken voice command is sent for transcription. No raw bank account balances, victim names, case evidence files, or FIR dossiers are ever sent to Sarvam or any external AI model.
- **Deeper Technical Answer**: Voice audio is streamed directly to `/api/v1/sarvam/transcribe` as raw 16kHz PCM. The resulting transcribed string (e.g., *"Show me the money trail"*) is returned to the client. The client-side navigation engine then resolves this command against local memory. Case data, graph topologies, and evidence bitstreams remain strictly within the local agency boundary.
- **Supporting Screen & Artifact**: Screen 26 (`26_model_voice_settings.png`) and backend proxy `backend/app/api/sarvam_voice.py`.

---

## 5. Scalability, Robustness & Production Boundaries

### Q11: How does TARKA handle massive evidence dumps containing hundreds of thousands of transactions?
- **15-Second Answer**: TARKA employs streaming ingestion and chunked parsing. In benchmark testing, it ingests and reconciles 10,000 synthetic transactions in under 52ms and 50,000 transactions in under 215ms.
- **Deeper Technical Answer**: The frontend uses Web Workers (`bulkIngestion.worker.ts`) and Canvas-based batch rendering rather than generating tens of thousands of DOM elements. Memory-intensive computations run in $O(N \log N)$ time. When graph node counts exceed 5,000, community aggregation combines dense clusters into single super-nodes to preserve a silky 60 FPS rendering rate.
- **Supporting Screen & Artifact**: Screen 22 (`22_benchmark_lab.png`) and automated benchmark test `benchmark.test.ts`.

---

### Q12: What happens if a backend worker process crashes during a large file ingestion?
- **15-Second Answer**: Ingestion jobs are transactional and idempotent. If a worker crashes, the evidence file remains safely sealed in the quarantine staging area without corrupting the case ledger.
- **Deeper Technical Answer**: Evidence admission operates in strict two-phase commit:
  1. **Phase 1 (Staging & Hashing)**: File stream is saved to disk and SHA-256 is computed.
  2. **Phase 2 (Admission & Extraction)**: Extraction workers process rows in batches of 1,000. If an unhandled exception occurs, the transaction rolls back, the admitted flag remains `FALSE`, and the incident is recorded in the Flight Recorder. No partial or corrupted records enter the canonical graph.
- **Supporting Screen & Artifact**: Screen 07 (`07_evidence_intake.png`) and backend test `test_massive_evidence_ingestion_and_admission.py`.

---

### Q13: What are the primary current limitations of the platform?
- **15-Second Answer**: TARKA is an investigative support platform, not a replacement for human judgment. It cannot auto-freeze bank accounts without an officer's digital signature, and live CBS integration currently uses standardized export formats rather than direct banking VPN pushes.
- **Deeper Technical Answer**:
  1. **Statutory Restraint**: The system deliberately lacks autonomous seizure authority; Indian law (BNSS §107) mandates human Investigating Officer orders.
  2. **Banking Gateway Boundaries**: Live core banking direct push requires dedicated mutual TLS (mTLS) bank leased lines; demonstration uses standardized CBS CSV and NPCI switch formats.
  3. **Acoustic Noise**: In open environments with ambient noise $> 65\text{ dB}$, push-to-talk (holding Spacebar) is recommended over hands-free VAD.
- **Supporting Screen & Artifact**: Limitations documented in `docs/final_ux/KNOWN_LIMITATIONS.md` and `FEATURE_VERIFICATION_MATRIX.md`.

