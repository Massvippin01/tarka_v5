"""
TARKA × SentinelX — Founder-Led Forensic Validation Lab Domain Models.
Implements strongly-typed Pydantic v2 schemas for:
- Validation sessions
- Test cases and test categories (TRACE, AEGIS, PLATFORM)
- Safe real-evidence intake records with immutable custody
- Separate out-of-band ground-truth manifests for blind evaluation
- Reproducible execution records and metric snapshots
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class EngineType(str, Enum):
    TRACE = "TRACE"
    AEGIS = "AEGIS"
    TXBENCH = "TXBENCH"
    UCM = "UCM"
    EVIDENCE_GATEWAY = "EVIDENCE_GATEWAY"
    FULL_WORKFLOW = "FULL_WORKFLOW"
    PLATFORM = "PLATFORM"


class TestCategory(str, Enum):
    __test__ = False
    TRACE = "TRACE"
    AEGIS = "AEGIS"
    PLATFORM = "PLATFORM"


class TestStatus(str, Enum):
    __test__ = False
    NOT_RUN = "NOT_RUN"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    INCONCLUSIVE = "INCONCLUSIVE"
    BLOCKED = "BLOCKED"
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"


class ConfusionType(str, Enum):
    TP = "TP"  # True Positive
    TN = "TN"  # True Negative
    FP = "FP"  # False Positive
    FN = "FN"  # False Negative
    INCONCLUSIVE = "INCONCLUSIVE"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class TransmissionChannel(str, Enum):
    DIRECT_EXPORT = "DIRECT_EXPORT"
    CAMERA_PHOTO = "CAMERA_PHOTO"
    WHATSAPP_COMPRESSED = "WHATSAPP_COMPRESSED"
    TELEGRAM_COMPRESSED = "TELEGRAM_COMPRESSED"
    DOCUMENT_SCAN = "DOCUMENT_SCAN"
    UNKNOWN = "UNKNOWN"


class RealEvidenceIntakeRecord(BaseModel):
    """Immutable audit record for real evidence uploaded in REAL_EVIDENCE mode."""
    evidence_id: str
    session_id: str
    case_id: str
    filename: str
    sha256: str
    size_bytes: int
    mime_type: str
    storage_path_raw: str
    storage_path_derived: str
    source_name: str = Field(..., description="Lawful origin or donor designation")
    acquisition_method: str = Field(..., description="E.g., Direct download, investigator export, citizen complaint")
    acquisition_timestamp: str = Field(..., description="When founder acquired the file (ISO 8601)")
    claimed_transaction_timestamp: Optional[str] = Field(None, description="Timestamp asserted inside the document")
    transmission_channel: TransmissionChannel = TransmissionChannel.UNKNOWN
    transformation_flags: List[str] = Field(default_factory=list, description="E.g., ['cropped', 'resized', 're-encoded']")
    redaction_notes: str = Field(default="", description="Verification of citizen PII redaction before upload")
    is_synthetic: bool = Field(default=False, description="Strictly False for REAL_EVIDENCE intake")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GroundTruthManifest(BaseModel):
    """Out-of-band ground-truth definition stored separately for blind testing."""
    manifest_id: str
    scenario_id: str
    scenario_title: str
    description: str
    category: TestCategory
    is_manipulated: Optional[bool] = None
    expected_amount: Optional[float] = None
    expected_utr: Optional[str] = None
    expected_status: Optional[str] = None
    expected_sender_vpa: Optional[str] = None
    expected_recipient_vpa: Optional[str] = None
    expected_discrepancy_delta: Optional[float] = None
    expected_reconciliation_verdict: Optional[str] = None
    expected_hypotheses_ranked: Optional[List[str]] = None
    expected_statutory_notices: Optional[List[str]] = None
    manipulated_region_bounding_boxes: Optional[List[List[int]]] = None  # [[x1, y1, x2, y2], ...]
    failure_assertions: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TestCase(BaseModel):
    """A granular validation test case executing a specific production pipeline."""
    __test__ = False
    test_id: str
    session_id: str
    case_id: str
    test_category: TestCategory
    scenario_id: str
    scenario_description: str
    engine: EngineType = EngineType.FULL_WORKFLOW
    evidence_file_ids: List[str] = Field(default_factory=list)
    original_file_hashes: Dict[str, str] = Field(default_factory=dict)
    ground_truth_manifest_id: Optional[str] = None
    expected_behaviour: str = ""
    execution_status: TestStatus = TestStatus.NOT_RUN
    actual_output: Optional[Dict[str, Any]] = None
    intermediate_observations: Optional[List[Dict[str, Any]]] = None
    engine_version: str = "tarka-engine-v2.0"
    config_version: str = "config-sutram-2026-v1"
    processing_duration_ms: float = 0.0
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: float = 0.0
    uncertainty: float = 0.0
    confusion_classification: ConfusionType = ConfusionType.NOT_APPLICABLE
    examiner_notes: str = ""
    reproduction_instructions: str = ""
    audit_events: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    executed_at: Optional[str] = None


class ValidationSession(BaseModel):
    """Top-level validation session grouping a collection of test cases."""
    session_id: str
    session_name: str
    mode: str = Field(default="REAL_EVIDENCE", description="'REAL_EVIDENCE' or 'SYNTHETIC_LAB'")
    examiner_id: str = "FOUNDER_VALIDATOR"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "ACTIVE"  # ACTIVE, COMPLETED, ARCHIVED
    notes: str = ""
    test_case_ids: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    inconclusive_tests: int = 0
    blocked_tests: int = 0
    not_implemented_tests: int = 0
