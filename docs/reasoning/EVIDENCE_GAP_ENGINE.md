# SentinelX 2026 — Evidence Gap Engine Specification
**Document ID**: `docs/reasoning/EVIDENCE_GAP_ENGINE.md`  
**Milestone**: Wave 3 (Evidence Reasoning Core)  
**Status**: `VERIFIED & ARCHITECTURALLY FROZEN`  

---

## 1. What Remains Unknown?

In investigative reasoning, what is **missing** is often more critical than what is present:
- Having CDR logs showing calls between two numbers proves telecommunication linkage, but **does not prove who possessed or registered the handset**.
- Having an ANPR toll sighting proves a car crossed a toll, but **does not prove the suspect was driving without driver-facing CCTV or facial capture**.
- Having a bank transfer proves money moved, but **does not prove beneficiary knowledge without account opening KYC documents**.

The SentinelX **EvidenceGapEngine** performs formal evidential deduction:
$$\text{HYPOTHESIS} \longrightarrow \text{REQUIRED EVIDENCE} \longrightarrow \text{AVAILABLE EVIDENCE} \longrightarrow \text{MISSING EVIDENCE} \longrightarrow \text{GAP}$$

The engine does not use trivial keyword heuristics; it checks the structural evidential prerequisites for legal attribution.

---

## 2. Canonical EvidenceGap Data Structure

Defined in [`backend/app/domain/canonical_evidence_ir.py`](file:///c:/PROJECTS/SentinelX/backend/app/domain/canonical_evidence_ir.py):

```python
class EvidenceGap(BaseModel):
    gap_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    gap_type: GapType
    title: str
    description: str
    hypothesis_id: Optional[str] = None
    required_evidence_type: str = ""
    available_evidence_ids: List[str] = Field(default_factory=list)
    missing_evidence_description: str = ""
    impact: str = ""
    recommended_action: str = ""
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    status: str = "OPEN"    # OPEN, IN_PROGRESS, RESOLVED, WAIVED
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    resolved_at: Optional[str] = None
```

### Gap Types:
- `IDENTITY_VERIFICATION`: Missing primary subscriber registration (e.g. CAF / biometric e-KYC).
- `SOURCE_CORROBORATION`: Single-source intelligence requiring corroborating corroboration.
- `TIMELINE_VERIFICATION`: Gaps in continuous movement logs or activity tracking.
- `LOCATION_VERIFICATION`: Sensor presence lacking corroborating secondary visual confirmation.
- `OWNERSHIP_VERIFICATION`: Asset registered under nominee/shell without beneficial ownership proof.
- `CHAIN_OF_CUSTODY`: Missing transfer receipt or acquisition audit log.
- `AUTHENTICITY_VERIFICATION`: Unsigned document or missing forensic laboratory certificate.
- `MISSING_ARTIFACT`: Referenced physical evidence not yet acquired or subpoenaed.
- `MISSING_METADATA`: Incomplete EXIF/IP headers or missing tower azimuth tables.
- `TEMPORAL_COVERAGE`: Gaps in CDR or audit log date ranges.
- `RELATIONSHIP_CORROBORATION`: Inferred syndicate link lacking corroborating financial or communication ties.

---

## 3. Burner SIM CAF Deductive Synthesis (CASE-2026-001)

In `CASE-2026-001`:
1. **Hypothesis**: Suspect Vikram Singh (P001) coordinates syndicate Hawala transfers via burner line `PH002` (`+91-9888044556`).
2. **Required Evidence**:
   - Primary: Biometric Customer Acquisition Form (CAF) with Aadhaar/Voter ID from telecom operator.
   - Secondary: Subscriber activation tower location and IMEI binding.
3. **Available Evidence**:
   - `SRC-AIRTEL-CDR` (Airtel CDR call logs showing calls between PH001 and PH002).
4. **Missing Evidence**:
   - Zero CAF documents or operator KYC verification records exist in the case artifacts for `PH002`.
5. **Synthesized Gap**:
   - `gap_type`: `IDENTITY_VERIFICATION`
   - `severity`: `CRITICAL`
   - `impact`: *"Primary suspect attribution relies on circumstantial CDR contact; cannot legally prove subscriber identity in court without CAF."*
   - `recommended_action`: *"Issue formal Section 91 CrPC notice to telecom operator to furnish verified CAF and CDR subscriber file for +91-9888044556."*

Verified in `test_evidence_gap_engine_formal_deduction` and `test_golden_case_wave3_full_reasoning_pipeline`.
