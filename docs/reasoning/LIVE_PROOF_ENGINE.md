# SentinelX 2026 — Live Proof Engine Specification
**Document ID**: `docs/reasoning/LIVE_PROOF_ENGINE.md`  
**Milestone**: Wave 3 (Evidence Reasoning Core)  
**Status**: `VERIFIED & ARCHITECTURALLY FROZEN`  

---

## 1. The Evidential Lineage Invariant

In judicial scrutiny under Section 65B of the Indian Evidence Act / Section 63 of Bharatiya Sakshya Adhiniyam, 2023, an intelligence graph assertion is admissible **only if the complete provenance chain can be verified from the high-level analytical claim down to the original physical or digital bits**.

The SentinelX **LiveProofEngine** provides deterministic, bidirectional traversal and cryptographic verification:

### Backward Traversal:
$$\mathbf{CLAIM} \longrightarrow \mathbf{RELATIONSHIP} \longrightarrow \mathbf{FACT} \longrightarrow \mathbf{OBSERVATION} \longrightarrow \mathbf{ARTIFACT} \longrightarrow \mathbf{SHA\text{-}256} \longrightarrow \mathbf{PROVENANCE} \longrightarrow \mathbf{CUSTODY}$$

### Forward Traversal:
$$\mathbf{ARTIFACT} \longrightarrow \mathbf{OBSERVATION} \longrightarrow \mathbf{FACT} \longrightarrow \mathbf{RELATIONSHIP} \longrightarrow \mathbf{CLAIM} \longrightarrow \mathbf{HYPOTHESIS}$$

---

## 2. Mandatory Verification Checkpoints

A proof is deemed **INVALID** if any single link in the evidential chain fails:

1. **Artifact Existence Check**: The source artifact UUIDv7 must resolve in the Unified Store and the raw content must exist in content-addressed storage.
2. **Cryptographic SHA-256 Check**: The disk file content is streamed and hashed in 64 KB chunks. The computed SHA-256 digest must match the recorded artifact digest bit-for-bit.
3. **Provenance Pedigree Check**: The artifact must possess an immutable `EvidenceProvenance` record whose `root_artifact_hash` matches the artifact digest.
4. **Custody Chain Audit Check**: Every custody event in the progression (`ACQUISITION`, `INGESTION_RECEIPT`, `HASH_VERIFICATION`, etc.) must record a `content_hash_at_event` that matches the artifact hash. Any hash drift flags custody tampering.
5. **Granular Source Location Check**: Every observation and fact must reference an explicit, granular location in the source artifact (line number, byte offset, record index, or JSON path). Generic, empty, or unanchored assertions fail verification.

---

## 3. Data Structures

Defined in [`backend/app/services/live_proof_engine.py`](file:///c:/PROJECTS/SentinelX/backend/app/services/live_proof_engine.py):

```python
@dataclass
class ProofStep:
    level: str  # CLAIM, RELATIONSHIP, FACT, OBSERVATION, ARTIFACT, SHA256, PROVENANCE, CUSTODY, HYPOTHESIS
    identifier: str
    status: str  # VERIFIED, FAILED, MISSING
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

@dataclass
class LiveProof:
    proof_id: str
    direction: str  # BACKWARD or FORWARD
    root_id: str
    is_valid: bool
    steps: List[ProofStep]
    errors: List[str]
    verified_at: str
    hash_verified: bool = False
    provenance_verified: bool = False
    custody_verified: bool = False
    source_location_verified: bool = False
```

---

## 4. Empirical Verification & Tamper Detection

1. **Unbroken Traversal**: Verified in `test_live_proof_engine_unbroken_backward_and_forward` using a Hawala transfer claim tracing back to physical JSON payload in storage. Result: `is_valid == True`, `hash_verified == True`, `provenance_verified == True`, `custody_verified == True`.
2. **Tamper Detection**: Verified in `test_live_proof_engine_broken_lineage_detection`. When an artifact's hash is corrupted in the registry, the engine detects:
   - `is_valid == False`
   - `hash_verified == False`
   - Error: *"Cryptographic hash mismatch! Storage: <disk_hash>, Recorded: 0000000000..."*
   - Custody event error: *"Custody event hash mismatch detected in artifact chain."*
