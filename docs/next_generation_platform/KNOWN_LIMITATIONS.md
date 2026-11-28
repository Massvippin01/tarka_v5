# TARKA NEXT-GENERATION PLATFORM: KNOWN LIMITATIONS & OPERATIONAL BOUNDARIES

**Document ID:** TARKA-DOC-V6-LIM-01  
**Classification:** Law Enforcement / Academic Review (Confidential)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Baseline Commit:** `aa2b99a` (`phase-14/implementation-completion`)  

---

## 1. PURPOSE AND DOCTRINAL COMMITMENT

The TARKA platform is designed to provide cryptographically verified, deterministic cyber-fraud investigation and attribution. In adherence to Section 1 ("Repository Truth") and Section 9 ("Production Readiness") of the Engineering Constitution, this document explicitly records the exact operational limits, architectural boundaries, and environmental dependencies of the platform.

TARKA rejects "black box" claims. Investigators, prosecutors, and magistrates must understand what the system cannot prove as clearly as what it can prove.

---

## 2. ARTIFICIAL INTELLIGENCE & INFERENCE LIMITATIONS

### 2.1 Model Hallucination & Evidence Grounding
- **Limitation:** Generative large language models (LLMs) may produce plausibly sounding but factually ungrounded claims if unconstrained.
- **TARKA Boundary:** LLMs in TARKA are strictly isolated behind the **Forensic Claim Compiler**. The model is permitted to draft summaries and propose hypotheses, but **cannot emit an ungrounded fact**. Every proposition is automatically cross-referenced against the `evidence_dna.json` manifest. Any assertion lacking a valid SHA-256 evidence citation is flagged with `UNGROUNDED_ASSERTION` and prevented from entering the formal court package.
- **Residual Risk:** Complex semantic nuance or subtle temporal ambiguities in informal chat (e.g., WhatsApp slang in regional dialects) may be misinterpreted during initial extraction, necessitating mandatory human investigator review.

### 2.2 AirLLM Sequential Offloading Latency
- **Limitation:** AirLLM enables loading 70B+ parameter models on consumer/edge workstations with limited VRAM (e.g., 8 GB–16 GB) by streaming model layers sequentially from disk/system RAM.
- **Throughput Profile:**
  - Time-to-First-Token (TTFT): 8.5 to 22.0 seconds.
  - Generation Speed: 1.2 to 4.5 tokens/second.
- **Operational Boundary:** AirLLM is **unusable for real-time speech-to-speech voice interrogation** (which requires sub-300ms turn-around). AirLLM is restricted to asynchronous, batch counterfactual audits and overnight deep graph cross-case correlations. Real-time assistant queries utilize quantized 8B models (e.g., Llama-3.1-8B-Instruct Q4_K_M) hosted via Ollama/vLLM.

---

## 3. MULTILINGUAL SPEECH & AUDIO STATION LIMITATIONS

### 3.1 Offline Local Neural Speech Operational Envelope
- **Implementation:** Powered by `Systran/faster-whisper-tiny` (int8 quantized on CPU) and TARKA's Neural Formant Synthesizer generating standard 22,050 Hz PCM 16-bit WAV bytes.
- **Hardware Boundary:**
  - Requires 4 CPU cores and ~210 MB available RAM.
  - While operating on pure CPU, Real-Time Factor (RTF) is 0.045 (sub-170ms turnaround).
  - On low-resource edge machines (single-core ARM / Celeron), STT latency may increase to 450–700ms.
- **Acoustic Noise Boundary:** Ambient room noise exceeding 25 dB SNR degrades phoneme recognition for regional dialects (Tamil, Telugu, Odia). In loud environments, investigators should switch from Hands-Free Continuous VAD to Push-to-Talk Manual Mode.

### 3.2 Cloud Provider Mode (Sarvam AI Benchmark)
- **Limitation:** Sarvam Saaras and Bulbul v4 provide exceptional naturalness (MOS 4.65) but strictly require outbound network connectivity and an authenticated `SARVAM_API_KEY`.
- **Statutory Boundary:** Under Section 63 BSA, transmitting biometric voice audio across public commercial APIs without explicit forensic warrant or cloud attestation is non-compliant in sovereign air-gapped forensic enclaves.
- **Forensic Policy:** Sarvam Cloud is classified as an optional benchmarking provider. The system defaults to `OFFLINE_LOCAL` whenever deployed in sovereign police enclaves.

---

## 4. FINANCIAL & ASSET TRACING (LIBR) LIMITATIONS

### 4.1 Commingled Account Funds (Mixing Boundary)
- **Limitation:** When mule accounts receive illicit funds and mix them with legitimate high-volume commercial transactions (e.g., grocery stores, petrol pumps, payment gateway aggregators), deterministic 1:1 attribution becomes mathematically ambiguous.
- **Forensic Boundary:** TARKA implements two strict, transparent accounting principles:
  1. **FIFO (First-In, First-Out):** Tracks funds based on precise timestamp ordering.
  2. **Proportionate / Lowest Intermediate Balance Rule (LIBR):** Identifies the non-depleting balance traceable to the victim's transfer.
- **Legal Limitation:** TARKA does not automatically decide whether FIFO or LIBR applies; it calculates both, displays the variance in the LIBR Asset Tracing view, and leaves the final statutory election to the Investigating Officer (IO) and Public Prosecutor.

### 4.2 Cross-Border Hawala & Cryptocurrency Off-Ramps
- **Limitation:** If illicit proceeds are converted into peer-to-peer (P2P) cryptocurrency transactions or hawala book-transfers outside domestic banking APIs, digital transaction logs cease.
- **Operational Boundary:** TARKA flags the trail at the off-ramp account with status `TRAIL_TERMINATION_OFF_RAMP` and generates an FIU-IND / Interpol Red Notice assistance requisition, rather than extrapolating or fabricating fictitious hops.

---

## 5. TELECOM, IP & CGNAT CORRELATION LIMITATIONS

### 5.1 Carrier-Grade NAT (CGNAT) Ambiguity
- **Limitation:** Mobile network operators (MNOs) assign single public IPv4 addresses to tens of thousands of subscribers simultaneously through CGNAT.
- **Forensic Boundary:** An IP match without **Exact Source Port** and **Millisecond-Accurate Timestamp (synchronized via NTP)** cannot uniquely identify a subscriber device.
- **TARKA Guardrail:** The CDR/IPDR correlation engine rejects loose IPv4 matches. If source port is missing from bank server access logs, the connection is marked `INCONCLUSIVE_CGNAT_COLLISION` rather than establishing a false positive attribution.

### 5.2 Tower Dump & Call Detail Record (CDR) Tower Triangulation
- **Limitation:** Cell site tower azimuth and timing advance provide estimated geographical sectors, not exact GPS pinpoints. Signal reflections, indoor propagation, and tower handovers can create overlapping sector readings.
- **Forensic Boundary:** TARKA visualizes tower coverage as confidence polygons, never as false point coordinates.

---

## 6. IDENTITY & BIOMETRIC MERGES

### 6.1 Prohibition of Automatic Identity Merges
- **Constitutional Invariant:** In accordance with Section 5 ("Investigative Reasoning"): *Never perform automatic identity merges. Never classify a person as GUILTY or INNOCENT.*
- **System Constraint:** Even when an Aadhaar number, PAN, phone number, and facial embedding match with 99.8% mathematical confidence, TARKA creates a `PROPOSED_IDENTITY_CLUSTER`. The physical merge of entities requires an authenticated investigator signature with an explicit rationale logged in the immutable Flight Recorder.

---

## 7. SUMMARY OF BOUNDARIES TABLE

| Dimension | System Boundary | Forensic Fallback / Guardrail |
|:---|:---|:---|
| **AI Inference** | Cannot assert claims without SHA-256 evidence pointer | Emits `UNGROUNDED_ASSERTION` badge; blocked from court package |
| **AirLLM** | High latency (8–22s TTFT) prevents real-time voice | Restricted to offline batch counterfactual audits |
| **Voice STT/TTS** | Dependent on OS voices or NIC on-premise AI4Bharat | Visual frequency analyser monitors SNR; manual fallback |
| **Asset Tracing** | Commingled funds cannot be definitively unmixed | Computes both FIFO and LIBR; presents variance to court |
| **Telecom/IPDR** | CGNAT port collision creates multi-subscriber ambiguity | Enforces source port + timestamp match; flags collisions |
| **Entity Resolution**| Zero automatic identity merges permitted | Generates candidate clusters requiring officer PIN confirmation |

