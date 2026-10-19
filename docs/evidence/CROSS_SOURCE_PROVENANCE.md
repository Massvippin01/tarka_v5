# SENTINELX 2026 — Cross-Source Evidence Provenance Model
**Document ID**: `docs/evidence/CROSS_SOURCE_PROVENANCE.md`  
**Status**: APPROVED & IMPLEMENTED (Wave 2)  
**Standard**: Cryptographic Non-Repudiation & Chain of Custody  

---

## 1. Ground Truth Provenance Spine

In SentinelX, no fact, entity, or relationship can exist in isolation. Every piece of derived intelligence must preserve a direct, verifiable path back to immutable source evidence.

```
RAW EXPORT (On-Disk Storage)
       │
       │ SHA-256 Content Hash
       ▼
EvidenceArtifact (UUIDv7, Storage URI, Mime Type)
       │
       ├─► EvidenceCustodyEvent (Acquisition, Transfers, Audits)
       ├─► EvidenceProvenance (Lineage steps, Source system, Audit ID)
       │
       ▼
EvidenceObservation (Source Location: Byte range, Line, JSON path)
       │
       ▼
EvidenceFact (Subject, Predicate, Object, Extraction Confidence, Reliability)
       │
       ├─► Canonical Entity / Canonical Relationship
       │
       ▼
EvidenceClaim (Epistemic Assertion, Supporting & Contradicting Facts)
```

---

## 2. Cryptographic Content Hashing vs Artifact Identity

- **Artifact ID**: RFC 9562 UUIDv7. Monotonically increasing with timestamp, ensuring globally unique, time-ordered database indexing.
- **Content Hash**: Full 64-character SHA-256 digest of original raw bytes.
- **Invariant**: The artifact ID and content hash are strictly separated. Two separate uploads of the identical file receive distinct UUIDv7 tracking records while pointing to the identical SHA-256 content address on storage.

---

## 3. Epistemic Separation of Metrics

Forensic intelligence requires strict separation between source reliability and analytical confidence:

1. **Extraction Confidence** (`0.0 – 1.0`): How certain is the parser that the string was extracted accurately from the file format?
2. **Source Reliability** (Admiralty System):
   - `A_COMPLETELY_RELIABLE`: Authoritative government export or cryptographically signed audit log.
   - `B_USUALLY_RELIABLE`: Established commercial entity or credible witness statement.
   - `C_FAIRLY_RELIABLE`: Single-source informant or unverified log.
   - `E_UNRELIABLE` / `F_CANNOT_BE_JUDGED`: Suspect claim or unverified data.
3. **Corroboration Level**:
   - `SINGLE_SOURCE`: Only one independent artifact supports this fact.
   - `CORROBORATED`: Two or more distinct sources verify this fact.
   - `CONTRADICTED`: Conflicting evidence exists in the repository.
4. **Epistemic Status**:
   - `FACT`: Authoritative recorded statement.
   - `INFERENCE`: Derived analytical deduction.
   - `HYPOTHESIS`: Competing investigative theory.
   - `DECISION`: Verified human investigator determination.

---

## 4. Reversible Traceability Queries

From any entity or relationship, SentinelX provides full backward traversal:
- `Relationship` → `evidence_references` → `EvidenceFact`
- `EvidenceFact` → `source_observation_id` → `EvidenceObservation`
- `EvidenceObservation` → `artifact_id` → `EvidenceArtifact`
- `EvidenceArtifact` → `content_hash` → File bytes & `custody_chain`
