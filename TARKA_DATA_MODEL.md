# TARKA — CANONICAL DATA MODEL SPECIFICATION
## Universal Case Model, Evidence Lineage & Statutory Schemas

**Document Version:** 1.0.0-PROD  
**Authority:** Chief Data Architect & Forensic Lead  
**Related Documents:** [TARKA_ARCHITECTURE.md](file:///C:/PROJECTS/SentinelX/TARKA_ARCHITECTURE.md)

---

## 1. CORE DESIGN PRINCIPLES

1. **Separation of Identity & Content:** The artifact's logical identity (`artifact_id`, generated as a monotonic UUIDv7) is mathematically decoupled from its content address (`content_hash`, SHA-256 bitstream digest). Two identical files uploaded to different cases receive unique artifact IDs but identical CAS storage addresses.
2. **Deterministic Epoch Normalization:** All temporal references are converted to UTC integer microseconds or milliseconds since Unix Epoch (1970-01-01T00:00:00Z). The special timestamp value `0` (Epoch zero) is preserved as a genuine timestamp and never treated as missing data.
3. **Explicit Uncertainty Intervals:** Timestamps extracted from uncalibrated systems (e.g., CCTV clocks, user-edited EXIF data) carry explicit skew intervals: $[t_{\text{min}}, t_{\text{max}}]$.
4. **Epistemic Standing:** Facts carry strict epistemic classifications: `OBSERVED` (directly recorded by instrumentation), `INFERRED` (deduced by an algorithm or model), or `ASSERTED` (claimed by an individual or witness).

---

## 2. UNIVERSAL CASE MODEL (UCM)

```python
class UniversalCaseModel(BaseModel):
    case_id: str = Field(..., description="Unique case identifier (e.g., upi_payment_discrepancy)")
    jurisdiction: str = Field("IN_DELHI", description="Statutory legal jurisdiction")
    statutory_framework: str = Field("BSA_2023", description="Governing evidence act (BSA 2023 / CrPC / BNSS)")
    title: str = Field(..., description="Investigation title")
    status: Literal["ACTIVE", "UNDER_REVIEW", "CLOSED", "ARCHIVED"] = "ACTIVE"
    created_at_utc: int = Field(..., description="Unix epoch microsecond timestamp")
    lead_examiner_id: str = Field(..., description="Designated authorized examiner ID")
    scope_description: str = Field(..., description="Statutory purpose and authorization scope")
```

---

## 3. EVIDENCE ARTIFACT MODEL (CAS BOUNDARY)

```python
class EvidenceArtifact(BaseModel):
    artifact_id: str = Field(..., description="Monotonic UUIDv7 identifier")
    case_id: str = Field(..., description="Parent case scope")
    filename: str = Field(..., description="Original acquired filename")
    byte_size: int = Field(..., description="Exact raw byte length")
    sha256_hash: str = Field(..., min_length=64, max_length=64, description="Cryptographic SHA-256 digest")
    cas_storage_uri: str = Field(..., description="Content-Addressed Storage URI (cas://sha256/...)")
    mime_type: str = Field(..., description="Normalized MIME format (application/pdf, text/csv, image/jpeg)")
    intake_source: Literal["FILE_UPLOAD", "DOWNLOADS_LOCAL", "EXTRACTION_DUMP"] = "FILE_UPLOAD"
    human_verified: bool = Field(False, description="Non-promotability invariant flag")
    intake_timestamp_utc: int = Field(..., description="Intake recording timestamp")
```

---

## 4. CANONICAL FACT MODEL

```python
class FactType(str, Enum):
    FINANCIAL_TRANSACTION = "FINANCIAL_TRANSACTION"
    CALL_DETAIL_RECORD = "CALL_DETAIL_RECORD"
    CHAT_MESSAGE = "CHAT_MESSAGE"
    LOCATION_PING = "LOCATION_PING"
    DEVICE_EXTRACTION = "DEVICE_EXTRACTION"

class CanonicalFact(BaseModel):
    fact_id: str = Field(..., description="Unique canonical fact identifier")
    source_artifact_id: str = Field(..., description="UUIDv7 of originating evidence artifact")
    fact_type: FactType
    timestamp_utc: int = Field(..., description="Normalized UTC Unix epoch timestamp")
    time_uncertainty_seconds: float = Field(0.0, description="Clock drift / uncertainty window [t - delta, t + delta]")
    entities: List[str] = Field(..., description="Extracted entity identifiers (bank acc, phone, UPI VPA, IMEI)")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Structured attributes (amount, duration, cell_id)")
    epistemic_status: Literal["OBSERVED", "INFERRED", "ASSERTED"] = "OBSERVED"
    substantive_hash: str = Field(..., description="Deterministic hash of fact attributes for tamper detection")
```

---

## 5. CONTRADICTION & SMT FINDING MODEL

```python
class ContradictionFinding(BaseModel):
    finding_id: str = Field(..., description="Finding identifier (e.g., Finding-02)")
    conflict_type: Literal["AMOUNT_DISCREPANCY", "KINEMATIC_IMPOSSIBILITY", "TEMPORAL_INVERSION", "IDENTITY_COLLISION"]
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = "CRITICAL"
    conflicting_fact_ids: List[str] = Field(..., min_length=2, description="Facts forming the Minimal Unsatisfiable Subset")
    conflicting_artifact_ids: List[str] = Field(..., min_length=2, description="Originating raw evidence artifacts")
    z3_unsat_core_formula: str = Field(..., description="Exported SMT-LIB2 formula string representing the conflict")
    plain_language_explanation: str = Field(..., description="Concise layman explanation (what is seen, what it means)")
    statutory_impact: str = Field(..., description="Legal evidentiary consequence under Section 63 BSA")
```

---

## 6. SECTION 63 BSA STATUTORY CERTIFICATE MODEL

```python
class Section63BSAReport(BaseModel):
    certificate_id: str = Field(..., description="Statutory certificate identifier")
    case_id: str = Field(..., description="Associated case scope")
    examiner_name: str = Field(..., description="Authorized forensic examiner identity")
    examiner_designation: str = Field(..., description="Official designation and cyber lab jurisdiction")
    act_name: str = Field("Bharatiya Sakshya Adhiniyam, 2023, Section 63", description="Governing statute")
    evidence_manifest: List[Dict[str, Any]] = Field(..., description="List of all admitted artifacts with SHA-256 digests")
    canonical_facts_count: int = Field(...)
    contradictions_isolated: List[Dict[str, Any]] = Field(...)
    substantive_content_sha256: str = Field(..., description="SHA-256 seal computed over canonical findings JSON")
    generation_time_ist: str = Field(..., description="Indian Standard Time timestamp of report generation")
```

---

## 7. PHASE 10: MULTIMODAL EVIDENCE & JOB ORCHESTRATION SCHEMAS

```python
class ForensicJobStatus(str, Enum):
    RECEIVED = "RECEIVED"
    VALIDATING = "VALIDATING"
    REGISTERED = "REGISTERED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    PARTIALLY_ANALYSED = "PARTIALLY_ANALYSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"

class ForensicJobRecord(BaseModel):
    job_id: str = Field(..., description="Unique UUID job identifier")
    case_id: str = Field(..., description="Scoped investigation case")
    state: ForensicJobStatus = ForensicJobStatus.RECEIVED
    progress_percent: int = Field(0, ge=0, le=100)
    current_stage: str = Field("INITIALIZED")
    created_at_iso: str
    updated_at_iso: str
    artifact_ids: List[str] = Field(default_factory=list)
    cancel_requested: bool = False
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class VisualExaminationResult(BaseModel):
    artifact_id: str
    filename: str
    case_id: str
    composite_anomaly_score: float = Field(..., ge=0.0, le=1.0)
    preliminary_assessment: Literal[
        "NO_OVERT_MANIPULATION_DETECTED",
        "POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES",
        "SUSPICIOUS_DIGITAL_MANIPULATION_INDICATORS",
    ]
    human_verified: bool = False
    conclusive: bool = False
    statutory_caveat: str
    modules: Dict[str, Any]  # metadata, extracted_fields, error_level_analysis, pixel_resampling, typography_inspection

class CompetingHypothesis(BaseModel):
    id: str  # H1, H2, H3
    title: str
    description: str
    score: float = Field(..., ge=0.0, le=1.0)
    supporting_observations: List[str]
    contradictory_observations: List[str]
    discriminative_actions: List[str]

class StatutoryEvidenceGap(BaseModel):
    gap_id: str
    description: str
    statutory_power: Literal["Section 94 BNSS", "Section 91 CrPC", "Section 69 IT Act", "Section 105 BNSS"]
    target_entity: str
    priority_score: float
```
