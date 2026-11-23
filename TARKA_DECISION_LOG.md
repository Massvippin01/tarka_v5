# TARKA — ARCHITECTURAL DECISION LOG (ADR)
## Formal Decision Records for SentinelX × TARKA Integration

**Document Version:** 1.0.0-PROD  
**Authority:** Architectural Review Board

---

### ADR-001: Separation of Artifact Identity (UUIDv7) and Content Hash (SHA-256)
- **Status:** `ACCEPTED & LOCKED`
- **Context:** In early prototypes, artifact IDs were frequently conflated with the SHA-256 hash. If two independent cases ingested the identical bank statement PDF, cross-case namespace collisions occurred.
- **Decision:** Every ingested file is assigned a time-ordered monotonic UUIDv7 as its logical `artifact_id`. Its physical CAS address remains the SHA-256 bitstream hash (`cas://sha256/<hash>`). This preserves de-duplication at the storage layer while maintaining strict case isolation in PostgreSQL.

---

### ADR-002: Formal SMT Verification Core (Z3) Over LLM Contradiction Detection
- **Status:** `ACCEPTED & LOCKED`
- **Context:** Generative AI models frequently hallucinate, miss subtle kinematic travel violations, or fail to compute exact numerical discrepancies across multiple financial records.
- **Decision:** All contradiction reasoning is delegated to the **Z3 SMT Solver v5.1.0** executing Minimal Unsatisfiable Subsets (Marco MUS) and Difference Logic. LLMs are strictly forbidden from asserting factual truth; they only propose queries and format layman explanations.

---

### ADR-003: Derived Graph Projection (PostgreSQL Authority, Neo4j Projection)
- **Status:** `ACCEPTED & LOCKED`
- **Context:** Graph databases lack the rigid transactional guarantees, point-in-time recovery, and tabular constraints of relational engines.
- **Decision:** PostgreSQL is the single transactional authority. Neo4j is a derived projection populated via incremental deltas. If Neo4j goes down or becomes corrupted, the entire investigation graph can be deterministically rebuilt from PostgreSQL without data loss.

---

### ADR-004: Evidence is DATA_ONLY (Prompt Injection Containment)
- **Status:** `ACCEPTED & LOCKED`
- **Context:** Digital evidence frequently contains malicious strings, adversarial prompts, or formatting designed to hijack LLM behavior.
- **Decision:** Evidence is ingested as raw byte streams and enclosed within strict passive data fences (`<evidence_data_fence>`). Evidence content is never evaluated as instructions, shell scripts, or agent commands.

---

### ADR-005: Dual Skeuomorphic Aesthetic Architecture
- **Status:** `ACCEPTED & LOCKED`
- **Context:** Forensic analysts require high-density, low-fatigue, tactile command surfaces rather than generic dark-mode SaaS dashboards or emoji-laden chatbots.
- **Decision:** Adopt the dual-reference skeuomorphic system inspired by `code.xr`:
  1. Primary Command Station: Warm tactile ivory/clay surface (`#F4EFEA`), recessed card wells, subtle embossed borders, floating prompt capsule header, and bottom pill dock.
  2. Auxiliary Navigation: 3D translucent curved frosted glass sidebar (`LUMEN`) with specular edge sheen for deep case context.

---

### ADR-006: Statutory Section 63 BSA Compliance with Substantive Digests
- **Status:** `ACCEPTED & LOCKED`
- **Context:** Indian evidentiary law requires rigorous 65B (now Section 63 BSA 2023) certificates for electronic records to be admissible in a court of law.
- **Decision:** The system computes a deterministic SHA-256 fingerprint over the canonical facts JSON. Any post-generation tampering with either the report text or the source evidence invalidates the cryptographic seal immediately.

---

### ADR-007: Local Web Audio VAD with Strict Non-Persistence
- **Status:** `ACCEPTED & LOCKED`
- **Context:** Privacy regulations forbid streaming raw room audio to external servers or saving voice recordings to local browser storage.
- **Decision:** Voice activity detection (VAD) runs in an ephemeral in-memory Web Audio ring buffer. Audio frames are cleared immediately upon turn completion; zero audio bytes are written to IndexedDB, localStorage, or server disk.
