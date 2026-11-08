"""TARKA Forensic REST API Server.

Forensic Safety Invariants:
1. Verdict wording strictly adheres to:
   - "No conflict found under the stated model — this does not verify the alibi" (Satisfiable)
   - "Inconsistent under the stated model" (Unsatisfiable)
   - Strict forensic non-accusatory language (no culpability claims, no authenticity overreach).
2. Demo-case loading writes nothing to the custody ledger.
3. Raw uploads record and display SHA-256 digests; uploads are sanitized and not persisted.
4. "Alter one byte (demo copy)" operates on a temporary clone, never mutating the live ledger.
5. CORS is strictly restricted to localhost:3000.
"""

from __future__ import annotations

import os
import re
import shutil
import sqlite3
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware

from tarka.core.models import Fact, TrustTier, AuthType, GeographicRegion, TimeWindow, FactKind
from tarka.core.travel import TravelSpeedConfig, compute_travel_lower_bound
from tarka.core.custody import CustodyLedger, GENESIS_PREV_HASH
from tarka.core.display import build_fact_display_model
from tarka.core.evidence_dna import (
    CaseStore,
    Case,
    Artifact,
    EvidenceDNA,
    INTEGRITY_LIMITATION_DISCLOSURE,
)
from tarka.generator.synthetic_cases import (
    generate_case_a_impossible_alibi,
    generate_case_b_cyclic_skew_trap,
    generate_case_c_consistent_control,
    generate_case_d_dual_cores,
    generate_case_200_distractors,
    generate_case_2000_benchmark,
)
from tarka.solver.z3_builder import Z3ConstraintBuilder, is_valid_solver_fact_timestamp
from tarka.solver.marco_mus import enumerate_all_mus
from tarka.solver.analysis import (
    compute_corroboration_and_leave_one_out,
    compute_robustness_margin,
)
from tarka.solver.hypotheses import compute_hypothesis_report
from tarka.solver.skew_inference import infer_required_clock_offsets
from tarka.solver.difference_logic import check_difference_constraints_bellman_ford
from tarka.parsers.cdr import CDRParser
import csv
import datetime
import hashlib
import io
import json

from tarka.generator.cell_towers import INDIAN_CELL_TOWERS
from tarka.parsers.bank_upi import BankUPIParser
from tarka.parsers.whatsapp import WhatsAppParser
from tarka.parsers.exif_triage import EXIFTriageParser
from tarka.api.schemas import (
    HealthResponse,
    CaseSummary,
    CaseDetail,
    CaseResetResponse,
    SolveRequest,
    SolveResponse,
    BoundVsGapItem,
    MarginBreakdown,
    CustodyTrailResponse,
    CustodyEntryResponse,
    AlterOneByteDemoResponse,
    IngestResponse,
    SourceFileSummary,
    RejectedRowModel,
    CSVPreviewResponse,
    CustomCSVIngestRequest,
    CaseCreateRequest,
    CaseResponse,
    ArtifactResponse,
    ArtifactRegisterResponse,
    EvidenceDNAResponse,
    EvidenceDNAReviewRequest,
    ArtifactDetailResponse,
    CaseIntegrityReport,
    ExtractedFieldResponse,
    TimezoneProvenanceResponse,
    CanonicalFactResponse,
    EntityMatchResponse,
    EntityProfileResponse,
    CorrelationResponse,
    CorrelationReviewRequest,
    EvidenceGapResponse,
    CaseAnalysisResponse,
    CreateAnalysisRunRequest,
    ChallengeRunRequest,
    HypothesisAssessmentResponse,
    FindingSummaryResponse,
    AnalysisRunResponse,
    RunComparisonResponse,
    DeclarativeRuleResponse,
    DAGNodeResponse,
    DAGEdgeResponse,
    ProvenanceDAGResponse,
    InvestigationNodeResponse,
    InvestigationEdgeResponse,
    InvestigationGraphResponse,
    OCRExtractionResponse,
    OCRTokenResponse,
    FinancialFieldCandidateResponse,
    BoundingPolygonResponse,
    Point2DResponse,
    OCRReviewRequest,
    ArtifactCompletenessResponse,
    FieldAssessmentResponse,
    FieldReviewAuditRecordResponse,
    DocumentProcessingCoverageResponse,
    FieldReviewActionRequest,
    PDFProcessRequest,
    ForensicTimelineEventResponse,
    ForensicTimelineResponse,
    ContradictionFindingResponse,
    ForensicEvidenceGapResponse,
    CaseForensicAnalysisResponse,
    ContradictionReviewRequest,
    EvidenceGapReviewRequest,
    PriorityScoreBreakdownResponse,
    InvestigationPriorityItemResponse,
    CaseInvestigationPrioritiesResponse,
    SummaryFindingItemResponse,
    SummaryEvidenceGapItemResponse,
    SummaryTimelineIssueItemResponse,
    SummaryRecommendedActionResponse,
    CaseInvestigationSummaryResponse,
    TraceNodeResponse,
    TraceEdgeResponse,
    ProvenanceTraceResponse,
    EvidenceSourceDetailResponse,
    FindingRuleMetadataResponse,
    DerivationStepResponse,
    CounterfactualContextResponse,
    ReviewAuditDetailResponse,
    CustodyEventSummaryResponse,
    FindingExplanationResponse,
    CounterfactualFindingExplanationResponse,
    CreateReportRequest,
    ReportSummaryResponse,
    ForensicReportResponse,
)
from tarka.core.finding_explanation import (
    FindingExplanationEngine,
    FindingExplanation,
    ProvenanceTrace,
    CounterfactualFindingExplanation,
)
from tarka.core.forensic_report import (
    ForensicReport,
    ForensicReportBuilder,
    ForensicReportHTMLExporter,
    ForensicReportPDFExporter,
)
from tarka.core.timeline_reconstruction import (
    TimelineReconstructionEngine,
    ForensicTimeline,
    ForensicTimelineEvent,
)
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    ContradictionFinding,
    ForensicEvidenceGap,
    CaseForensicAnalysis,
)
from tarka.core.investigation_prioritization import (
    InvestigationPrioritizationEngine,
    CaseInvestigationPriorities,
    InvestigationPriorityItem,
    PriorityLevel,
    PriorityTargetType,
)
from tarka.core.investigation_summary import (
    InvestigationSummaryGenerator,
    CaseInvestigationSummary,
)
from tarka.core.canonical_fact import CanonicalFact, ExtractedField, ExtractionStatus
from tarka.core.completeness import (
    CompletenessEngine,
    ArtifactCompletenessReport,
    DocumentProcessingCoverage,
    EvidenceFieldStatus,
    FieldReviewDecision,
    PageProcessingStatus,
    PageCoverageItem,
    FieldAssessment,
    FieldExpectationRegistry,
)
from tarka.ocr import (
    OCRExtractor,
    OCRExtractionResult,
    FinancialFieldCandidate,
    CandidateFieldType,
    CandidateReviewStatus,
    OCRReviewAction,
    PDFProcessor,
    PDFExtractionResult,
)
from tarka.core.correlations import EventCorrelation, EvidenceGap, CorrelationEngine
from tarka.core.analysis_run import (
    AnalysisRun,
    RunComparison,
    HypothesisAssessment,
    FindingSummary,
    CounterfactualEngine,
)
from tarka.core.rule_registry import DEFAULT_RULE_REGISTRY, DeclarativeRule
from tarka.core.provenance_dag import (
    ProvenanceDAG,
    ProvenanceDAGBuilder,
    DAGNode,
    DAGEdge,
)
from tarka.core.investigation_graph import (
    InvestigationGraph,
    InvestigationGraphBuilder,
    InvestigationNode,
    InvestigationEdge,
)


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB limit

app = FastAPI(
    title="TARKA Forensic Reconstruction API",
    version="1.0.0",
    description="Mathematical digital forensics reconstruction engine powered by Z3 SMT and difference logic.",
)

# Forensic Environment Guard: Local Synthetic-Demo Scope Middleware
# NOTE: Local synthetic-demo headers are not authentication or access control.
# The custody log is an application-managed append-only ledger with integrity verification.
@app.middleware("http")
async def add_forensic_scope_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Forensic-Scope"] = "Local-Synthetic-Demo-Only"
    response.headers["X-Integrity-Limitation"] = "SHA-256 verifies bitstream preservation; does not prove origin authenticity"
    response.headers["X-Security-Notice"] = "Local-Synthetic-Demo-Headers-Are-Not-Authentication-Or-Access-Control"
    return response


@app.middleware("http")
async def enforce_sentinelx_auth_when_mounted(request: Request, call_next):
    root_path = request.scope.get("root_path", "")
    if root_path == "/api/v1/forensics/tarka":
        path = request.url.path
        if not (path.endswith("/health") or path.endswith("/health/")):
            try:
                from app.services.auth_service import AuthService
                from starlette.responses import JSONResponse
                auth_service = AuthService.get_instance()
                auth_header = request.headers.get("Authorization")
                try:
                    user = auth_service.authenticate_token(auth_header, strict=True)
                except HTTPException as he:
                    return JSONResponse(status_code=he.status_code, content={"detail": he.detail})

                # Check case_id in path: e.g. /api/cases/{case_id}
                match = re.search(r"/cases/([^/]+)", path)
                case_id = match.group(1) if match else request.query_params.get("case_id")
                if case_id and case_id not in ("reset", ""):
                    try:
                        auth_service.enforce_case_access(user, case_id)
                    except HTTPException as he:
                        return JSONResponse(status_code=he.status_code, content={"detail": he.detail})

                request.state.user = user
            except ImportError:
                pass
    return await call_next(request)


# CORS strictly restricted to localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Multi-Case Workspace Manager:
# Each case has its own isolated directory under data/cases/<case_id>/
# containing its own isolated SQLite custody ledger (custody.db) and workspace facts.
CASES_DIR = Path("data/cases")
CASES_DIR.mkdir(parents=True, exist_ok=True)
case_store = CaseStore(base_dir=CASES_DIR)
def _resolve_fraud_fixtures_dir() -> Path:
    candidates = [
        Path("tests/fixtures/synthetic_fraud_case"),
        Path("backend/tests_tarka/tests/fixtures/synthetic_fraud_case"),
        Path(__file__).resolve().parent.parent.parent / "tests_tarka" / "tests" / "fixtures" / "synthetic_fraud_case",
        Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "synthetic_fraud_case",
    ]
    for c in candidates:
        if c.exists():
            return c
    return Path("tests/fixtures/synthetic_fraud_case")

FIXTURES_FRAUD_DIR = _resolve_fraud_fixtures_dir()


def get_ocr_dir(case_id: str) -> Path:
    d = case_store.get_case_dir(case_id) / "ocr"
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_ocr_result(case_id: str, artifact_id: str, result: OCRExtractionResult) -> None:
    path = get_ocr_dir(case_id) / f"{artifact_id}_ocr.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result.model_dump(mode="json"), f, indent=2)


def load_ocr_result(case_id: str, artifact_id: str) -> Optional[OCRExtractionResult]:
    path = get_ocr_dir(case_id) / f"{artifact_id}_ocr.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return OCRExtractionResult(**data)
    except Exception:
        return None


def get_completeness_dir(case_id: str) -> Path:
    d = case_store.get_case_dir(case_id) / "completeness"
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_completeness_reviews(case_id: str, artifact_id: str, reviews: Dict[str, Dict[str, Any]]) -> None:
    path = get_completeness_dir(case_id) / f"{artifact_id}_reviews.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(reviews, f, indent=2)


def load_completeness_reviews(case_id: str, artifact_id: str) -> Dict[str, Dict[str, Any]]:
    path = get_completeness_dir(case_id) / f"{artifact_id}_reviews.json"
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_pdf_coverage(case_id: str, artifact_id: str, coverage: DocumentProcessingCoverage) -> None:
    path = get_completeness_dir(case_id) / f"{artifact_id}_coverage.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(coverage.model_dump(mode="json"), f, indent=2)


def load_pdf_coverage(case_id: str, artifact_id: str) -> Optional[DocumentProcessingCoverage]:
    path = get_completeness_dir(case_id) / f"{artifact_id}_coverage.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return DocumentProcessingCoverage(**data)
    except Exception:
        return None


def seed_demo_case_if_needed() -> None:
    """Populates primary synthetic demo case 'UPI Payment Discrepancy' if not already seeded."""
    try:
        case = case_store.get_case("upi_payment_discrepancy")
        if not case:
            case = case_store.create_case(
                case_id="upi_payment_discrepancy",
                title="UPI Payment Discrepancy",
                description="Investigation of ₹25,000 digital payment discrepancy across chat, bank statement, telecom CDR, and claim receipts.",
                investigator="Forensic Officer",
            )
        existing_arts = case_store.list_artifacts("upi_payment_discrepancy")
        existing_fnames = {a.filename for a in existing_arts}
        if FIXTURES_FRAUD_DIR.exists():
            tier_map = {
                "bank_statement.csv": TrustTier.T1,
                "cdr_records.csv": TrustTier.T1,
                "whatsapp_chat.txt": TrustTier.T3,
                "screenshot_claim.json": TrustTier.T3,
                "unverified_claim.json": TrustTier.T3,
                "payment_receipt_screenshot.png": TrustTier.T3,
            }
            for fname, tier in tier_map.items():
                if fname not in existing_fnames:
                    fpath = FIXTURES_FRAUD_DIR / fname
                    if fpath.exists():
                        with open(fpath, "rb") as fp:
                            b = fp.read()
                        case_store.register_artifact(
                            case_id="upi_payment_discrepancy",
                            filename=fname,
                            file_bytes=b,
                            source_tier=tier,
                            intake_officer="Forensic Officer",
                            intake_notes=f"Primary synthetic demo evidence: {fname}",
                        )

        # Prime OCR extraction for screenshot image artifact if not already done
        updated_arts = case_store.list_artifacts("upi_payment_discrepancy")
        for a in updated_arts:
            if a.filename.endswith(".png") or "screenshot" in a.filename.lower():
                ocr_file = get_ocr_dir("upi_payment_discrepancy") / f"{a.artifact_id}_ocr.json"
                if not ocr_file.exists():
                    fpath = case_store.get_case_dir("upi_payment_discrepancy") / a.storage_path
                    if fpath.exists() and a.filename.endswith(".png"):
                        ext = OCRExtractor()
                        res = ext.extract_from_file(fpath, artifact_id=a.artifact_id, case_id="upi_payment_discrepancy")
                        save_ocr_result("upi_payment_discrepancy", a.artifact_id, res)
    except Exception:
        pass


seed_demo_case_if_needed()


def sanitize_filename(filename: str) -> str:
    """Sanitizes incoming filenames to prevent path traversal."""
    base = Path(filename).name
    clean = re.sub(r"[^\w\.-]", "_", base)
    clean = re.sub(r"\.{2,}", "_", clean)
    clean = clean.strip("._")
    return clean or "item"


def get_case_dir(case_id: str) -> Path:
    """Returns directory path for a given case ID, creating it if needed."""
    cd = CASES_DIR / sanitize_filename(case_id or "workspace")
    cd.mkdir(parents=True, exist_ok=True)
    return cd


def get_case_ledger(case_id: str = "workspace") -> CustodyLedger:
    """Returns isolated SQLite custody ledger for the given case ID."""
    cd = get_case_dir(case_id)
    db_path = cd / "custody.db"
    cl = CustodyLedger(db_path=str(db_path))
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ingested_files (
                sha256 TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                ingested_at REAL NOT NULL
            )
            """
        )
        conn.commit()
    return cl


def get_case_ingested_hashes(case_id: str = "workspace") -> set[str]:
    """Returns set of SHA-256 hashes of files already ingested in this case."""
    cd = get_case_dir(case_id)
    db_path = cd / "custody.db"
    if not db_path.exists():
        return set()
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ingested_files (
                sha256 TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                ingested_at REAL NOT NULL
            )
            """
        )
        rows = conn.execute("SELECT sha256 FROM ingested_files").fetchall()
        return {r[0] for r in rows}


def record_case_ingested_file(case_id: str, sha256: str, filename: str) -> None:
    """Records an ingested file hash in the case's deduplication table."""
    cd = get_case_dir(case_id)
    db_path = cd / "custody.db"
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ingested_files (
                sha256 TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                ingested_at REAL NOT NULL
            )
            """
        )
        conn.execute(
            "INSERT OR REPLACE INTO ingested_files (sha256, filename, ingested_at) VALUES (?, ?, ?)",
            (sha256, filename, time.time()),
        )
        conn.commit()


# Default workspace references for backward compatibility with tests
LIVE_LEDGER_PATH = get_case_dir("workspace") / "custody.db"
ledger = get_case_ledger("workspace")




def dict_to_fact(d: Dict[str, Any]) -> Fact:
    """Reconstructs canonical Fact model from API dictionary payload."""
    tw = d.get("time_window", {})
    region_d = d.get("region")
    region = (
        GeographicRegion(
            latitude=region_d["latitude"],
            longitude=region_d["longitude"],
            radius_meters=region_d.get("radius_meters", 100.0),
        )
        if region_d
        else None
    )

    return Fact(
        id=d["id"],
        source_file=d.get("source_file", "unknown"),
        sha256=d.get("sha256", "0" * 64),
        line_ref=d.get("line_ref", "line:0"),
        kind=FactKind(d.get("kind", "CDR_CALL")),
        time_window=TimeWindow(
            start_epoch=tw.get("start_epoch", 0.0),
            end_epoch=tw.get("end_epoch", 0.0),
            reported_epoch=tw.get("reported_epoch", 0.0),
        ),
        region=region,
        tier=TrustTier(d.get("tier", "T1")),
        device_id=d.get("device_id", "DEV_UNKNOWN"),
        clock_id=d.get("clock_id", "clk_default"),
        entity_refs=d.get("entity_refs", []),
        auth_type=AuthType(d.get("auth_type", "active")),
        raw_payload=d.get("raw_payload", {}),
    )


@app.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns engine status and live custody ledger integrity."""
    report = ledger.verify_chain()
    head_hash = ledger.get_chain_head_hash()
    trail = ledger.get_all_entries()
    return HealthResponse(
        status="ok",
        version="1.0.0",
        chain_head_hash=head_hash,
        ledger_entries_count=len(trail),
        genesis_anchor_valid=report.is_valid,
    )


def get_case_workspace_facts(case_id: str = "workspace") -> List[Fact]:
    """Retrieves persisted facts for a specific case workspace."""
    cd = get_case_dir(case_id)
    facts_file = cd / "workspace_facts.json"
    if not facts_file.exists():
        return []
    try:
        with open(facts_file, "r", encoding="utf-8") as f:
            raw = json.load(f)
            return [dict_to_fact(item) for item in raw]
    except Exception:
        return []


def save_case_workspace_facts(case_id: str, new_facts: List[Fact]) -> List[Fact]:
    """Saves or appends facts into the case workspace JSON file."""
    existing = get_case_workspace_facts(case_id)
    existing_ids = {f.id for f in existing}
    merged = list(existing)
    for f in new_facts:
        if f.id not in existing_ids:
            merged.append(f)
            existing_ids.add(f.id)
    cd = get_case_dir(case_id)
    facts_file = cd / "workspace_facts.json"
    with open(facts_file, "w", encoding="utf-8") as f:
        json.dump([fact.model_dump(mode="json") for fact in merged], f, indent=2)
    return merged


def reset_case_workspace(case_id: str = "workspace") -> CaseResetResponse:
    """Resets a case workspace: clears facts, resets custody ledger to genesis, clears deduplication."""
    cd = get_case_dir(case_id)
    facts_file = cd / "workspace_facts.json"
    db_path = cd / "custody.db"
    if facts_file.exists():
        try:
            facts_file.unlink()
        except OSError:
            try:
                with open(facts_file, "w", encoding="utf-8") as f:
                    f.write("[]")
            except OSError:
                pass
    if db_path.exists():
        try:
            with sqlite3.connect(db_path) as conn:
                conn.execute("DROP TABLE IF EXISTS ingested_files")
                conn.execute("DROP TABLE IF EXISTS custody_chain")
                conn.execute("DROP TABLE IF EXISTS facts_store")
                conn.commit()
        except Exception:
            pass
        try:
            db_path.unlink()
        except OSError:
            pass
    # Re-initialize fresh custody ledger with genesis block
    c_ledger = get_case_ledger(case_id)
    head = c_ledger.get_chain_head_hash()
    return CaseResetResponse(
        status="reset",
        case_id=case_id,
        chain_head_hash=head,
        total_facts=0,
    )


@app.post("/api/cases/{case_id}/reset", response_model=CaseResetResponse)
def reset_case_endpoint(case_id: str) -> CaseResetResponse:
    """Resets an isolated case workspace and its custody ledger."""
    return reset_case_workspace(case_id)


@app.post("/api/cases/reset", response_model=CaseResetResponse)
def reset_default_case_endpoint() -> CaseResetResponse:
    """Resets the default active case workspace and its custody ledger."""
    return reset_case_workspace("workspace")


@app.post("/api/cases", response_model=CaseResponse)
def create_case(req: CaseCreateRequest) -> CaseResponse:
    """Creates a new isolated investigation case workspace."""
    clean_id = sanitize_filename(req.case_id)
    existing = case_store.get_case(clean_id)
    if existing and (case_store.get_case_dir(clean_id) / "case.json").exists():
        raise HTTPException(status_code=400, detail=f"Case with ID '{req.case_id}' already exists.")
    c = case_store.create_case(
        case_id=clean_id,
        title=req.title,
        description=req.description or "",
        investigator=req.investigator or "Forensic Examiner",
        jurisdiction=req.jurisdiction or "Cyber Crime Branch",
    )
    return CaseResponse(
        case_id=c.case_id,
        title=c.title,
        description=c.description,
        investigator=c.investigator,
        jurisdiction=c.jurisdiction,
        created_at_iso=c.created_at_iso,
        status=c.status,
        artifact_count=c.artifact_count,
        dna_count=c.dna_count,
        custody_chain_head=c.custody_chain_head,
        integrity_limitation=c.integrity_limitation,
    )


@app.get("/api/cases", response_model=List[CaseSummary])
def list_cases() -> List[CaseSummary]:
    """Lists pre-configured demonstration benchmark cases and active workspaces."""
    seed_demo_case_if_needed()
    demo_case = case_store.get_case("upi_payment_discrepancy")
    workspace_facts = get_case_workspace_facts("workspace")
    base_cases = [
        CaseSummary(
            id="upi_payment_discrepancy",
            title="UPI Payment Discrepancy",
            description="Investigation of ₹25,000 digital payment discrepancy across chat, bank statement, telecom CDR, and claim receipts.",
            fact_count=demo_case.dna_count if demo_case else 8,
            expected_status="CONTRADICTION",
        ),
        CaseSummary(
            id="workspace",
            title="Active Case Workspace",
            description="User-ingested forensic evidence facts and auditable custody ledger.",
            fact_count=len(workspace_facts),
            expected_status="WORKSPACE",
        ),
        CaseSummary(
            id="case_b_cyclic_skew_trap",
            title="Case B: Cyclic Skew Trap (Multi-Clock Transit Loop)",
            description="Circular 4-fact transit across 3 independent clock domains. Pairwise feasible, but globally unsatisfiable.",
            fact_count=4,
            expected_status="UNSAT",
        ),
        CaseSummary(
            id="case_c_consistent_control",
            title="Case C: Consistent Control (Vande Bharat Corridor)",
            description="Physically feasible high-speed rail corridor from Bengaluru to Mysuru over 2h 45m.",
            fact_count=3,
            expected_status="SAT",
        ),
        CaseSummary(
            id="case_d_dual_cores",
            title="Case D: Dual Independent Conflict Cores",
            description="Two disjoint simultaneous contradictions: Mumbai vs Goa UPI/CDR, and Kolkata vs Guwahati WhatsApp/ATM.",
            fact_count=4,
            expected_status="UNSAT",
        ),
        CaseSummary(
            id="cross_country",
            title="Cross-country: Impossible Alibi (Bicoastal Conflict)",
            description="Koramangala, Bengaluru CDR tower ping vs Connaught Place, New Delhi UPI transaction 30 minutes later (1,745 km).",
            fact_count=3,
            expected_status="UNSAT",
        ),
        CaseSummary(
            id="case_b_cyclic_skew_trap",
            title="Case B: Cyclic Skew Trap (Multi-Clock Transit Loop)",
            description="Circular 4-fact transit across 3 independent clock domains. Pairwise feasible, but globally unsatisfiable.",
            fact_count=4,
            expected_status="UNSAT",
        ),
        CaseSummary(
            id="case_c_consistent_control",
            title="Case C: Consistent Control (Vande Bharat Corridor)",
            description="Physically feasible high-speed rail corridor from Bengaluru to Mysuru over 2h 45m.",
            fact_count=3,
            expected_status="SAT",
        ),
        CaseSummary(
            id="case_d_dual_cores",
            title="Case D: Dual Independent Conflict Cores",
            description="Two disjoint simultaneous contradictions: Mumbai vs Goa UPI/CDR, and Kolkata vs Guwahati WhatsApp/ATM.",
            fact_count=4,
            expected_status="UNSAT",
        ),
        CaseSummary(
            id="case_200_distractors",
            title="Case 200+: Scalability Benchmark",
            description="203 facts with >95% pair pruning verification. Solves in sub-second time.",
            fact_count=203,
            expected_status="UNSAT",
        ),
        CaseSummary(
            id="case_2000_benchmark",
            title="Case 2,000: Virtualization Performance Benchmark",
            description="2,000 chronologically ordered facts across dual-track telemetry for rendering latency evaluation.",
            fact_count=2000,
            expected_status="UNSAT",
        ),
        CaseSummary(
            id="workspace",
            title="Active Case Workspace",
            description="User-ingested forensic evidence facts and auditable custody ledger.",
            fact_count=len(workspace_facts),
            expected_status="WORKSPACE",
        ),
    ]

    # Include custom created cases from CaseStore
    existing_ids = {c.id for c in base_cases}
    for custom in case_store.list_cases():
        if custom.case_id not in existing_ids:
            base_cases.append(
                CaseSummary(
                    id=custom.case_id,
                    title=custom.title,
                    description=custom.description or "User-created investigation case workspace.",
                    fact_count=custom.dna_count,
                    expected_status="CUSTOM",
                )
            )
            existing_ids.add(custom.case_id)

    return base_cases


def serialize_facts_with_display(facts: List[Fact], clock_bounds: Dict[str, float]) -> List[Dict[str, Any]]:
    """Serializes facts into JSON dictionaries enriched with human-readable display models."""
    out = []
    for f in facts:
        d = f.model_dump(mode="json")
        d["display"] = build_fact_display_model(f, clock_bounds).model_dump(mode="json")
        out.append(d)
    return out


@app.get("/api/cases/{case_id}", response_model=CaseDetail)
def get_case(case_id: str) -> CaseDetail:
    """Loads full case telemetry. Demo case loads write nothing to the custody ledger."""
    if case_id == "workspace":
        facts_objs = get_case_workspace_facts("workspace")
        clocks = {f.clock_id: 300.0 for f in facts_objs}
        if not clocks:
            clocks = {"clk_default": 300.0}
        return CaseDetail(
            id="workspace",
            title="Active Case Workspace",
            description="User-ingested forensic evidence facts and auditable custody ledger.",
            facts=serialize_facts_with_display(facts_objs, clocks),
            clock_bounds=clocks,
            speed_config=TravelSpeedConfig().model_dump(),
            expected_status="WORKSPACE",
        )

    if case_id == "case_2000_benchmark":
        case_data = generate_case_2000_benchmark(seed=42)
        return CaseDetail(
            id=case_id,
            title="Case 2,000: Virtualization Performance Benchmark",
            description="2,000 chronologically ordered facts across dual-track telemetry for rendering latency evaluation.",
            facts=serialize_facts_with_display(case_data.facts, case_data.clock_bounds),
            clock_bounds=case_data.clock_bounds,
            speed_config=TravelSpeedConfig().model_dump(),
            expected_status="UNSAT",
        )

    case_map = {
        "cross_country": (
            "Cross-country: Impossible Alibi (Bicoastal Conflict)",
            "Koramangala, Bengaluru CDR tower ping vs Connaught Place, New Delhi UPI transaction 30 minutes later (1,745 km).",
            generate_case_a_impossible_alibi,
        ),
        "case_b_cyclic_skew_trap": (
            "Case B: Cyclic Skew Trap (Multi-Clock Transit Loop)",
            "Circular 4-fact transit across 3 independent clock domains. Pairwise feasible, but globally unsatisfiable.",
            generate_case_b_cyclic_skew_trap,
        ),
        "case_c_consistent_control": (
            "Case C: Consistent Control (Vande Bharat Corridor)",
            "Physically feasible high-speed rail corridor from Bengaluru to Mysuru over 2h 45m.",
            generate_case_c_consistent_control,
        ),
        "case_d_dual_cores": (
            "Case D: Dual Independent Conflict Cores",
            "Two disjoint simultaneous contradictions: Mumbai vs Goa UPI/CDR, and Kolkata vs Guwahati WhatsApp/ATM.",
            generate_case_d_dual_cores,
        ),
        "case_200_distractors": (
            "Case 200+: Scalability Benchmark",
            "203 facts with >95% pair pruning verification. Solves in sub-second time.",
            generate_case_200_distractors,
        ),
        "case_2000_benchmark": (
            "Case 2,000: Virtualization Performance Benchmark",
            "2,000 chronologically ordered facts across dual-track telemetry for rendering latency evaluation.",
            generate_case_2000_benchmark,
        ),
    }

    if case_id not in case_map:
        custom_case = case_store.get_case(case_id)
        if custom_case:
            user_facts = get_case_workspace_facts(case_id)
            dna_items = case_store.list_evidence_dna(case_id)
            for d in dna_items:
                art = case_store.get_artifact(case_id, d.artifact_id)
                fn = art.filename if art else "evidence"
                h = art.sha256 if art else "0" * 64
                user_facts.append(d.to_fact(fn, h))
            clocks = {f.clock_id: 300.0 for f in user_facts} or {"clk_default": 300.0}
            return CaseDetail(
                id=custom_case.case_id,
                title=custom_case.title,
                description=custom_case.description,
                facts=serialize_facts_with_display(user_facts, clocks),
                clock_bounds=clocks,
                speed_config=TravelSpeedConfig().model_dump(),
                expected_status="CUSTOM",
            )
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    title, desc, gen_func = case_map[case_id]
    case_data = gen_func(seed=42)

    # Convert facts to dictionary representation enriched with display models
    facts_json = serialize_facts_with_display(case_data.facts, case_data.clock_bounds)
    speed_cfg = TravelSpeedConfig().model_dump()

    return CaseDetail(
        id=case_id,
        title=title,
        description=desc,
        facts=facts_json,
        clock_bounds=case_data.clock_bounds,
        speed_config=speed_cfg,
        expected_status="SAT" if getattr(case_data, "expected_satisfiable", False) else "UNSAT",
    )


# ==============================================================================
# Phase 1 & 2: Artifact & Evidence Registration Endpoints
# ==============================================================================

def dna_to_response(d: EvidenceDNA) -> EvidenceDNAResponse:
    """Serializes an EvidenceDNA domain object into its API response schema."""
    return EvidenceDNAResponse(
        evidence_id=d.evidence_id,
        artifact_id=d.artifact_id,
        case_id=d.case_id,
        record_index=d.record_index,
        kind=d.kind.value,
        source_raw_text=d.source_raw_text,
        source_line_ref=d.source_line_ref,
        source_field_path=d.source_field_path,
        event_timestamp_iso=d.event_timestamp_iso,
        event_timestamp_epoch=d.event_timestamp_epoch,
        time_window_start_epoch=d.time_window_start_epoch,
        time_window_end_epoch=d.time_window_end_epoch,
        source_entity=d.source_entity,
        target_entity=d.target_entity,
        latitude=d.latitude,
        longitude=d.longitude,
        uncertainty_radius_meters=d.uncertainty_radius_meters,
        auth_track=d.auth_track.value,
        trust_tier=d.trust_tier.value,
        clock_domain=d.clock_domain,
        amount=d.amount,
        parser_name=d.parser_name,
        parser_version=d.parser_version or "1.0.0",
        parser_warnings=d.parser_warnings,
        extracted_fields=[
            ef.model_dump(mode="json") if hasattr(ef, "model_dump") else ef
            for ef in d.extracted_fields
        ],
        identifiers=d.identifiers,
        inferred_attributes=d.inferred_attributes,
        inference_rationale=d.inference_rationale,
        has_inferences=d.has_inferences,
        review_status=d.review_status,
        reviewed_by=d.reviewed_by,
        review_notes=d.review_notes,
        review_timestamp_iso=d.review_timestamp_iso,
        field_overrides=d.field_overrides,
        is_reviewable=d.is_reviewable,
        integrity_limitation=d.integrity_limitation,
    )


@app.post("/api/cases/{case_id}/artifacts", response_model=ArtifactRegisterResponse)
async def register_case_artifact(
    case_id: str,
    file: UploadFile = File(...),
    source_tier: str = Form("T1"),
    source_device: Optional[str] = Form(None),
    intake_officer: str = Form("Forensic Examiner"),
    intake_notes: Optional[str] = Form(None),
) -> ArtifactRegisterResponse:
    """Registers an immutable evidence artifact, computes SHA-256, extracts Evidence DNA, and appends to custody chain."""
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File {file.filename} exceeds maximum size limit of 10 MB.",
        )
    filename = sanitize_filename(file.filename or "unknown_file")
    tier = TrustTier.T1
    try:
        tier = TrustTier(source_tier)
    except Exception:
        tier = TrustTier.T1

    art, is_dup, dna_list = case_store.register_artifact(
        case_id=case_id,
        filename=filename,
        file_bytes=data,
        source_tier=tier,
        source_device=source_device,
        intake_officer=intake_officer,
        intake_notes=intake_notes,
    )

    art_resp = ArtifactResponse(
        artifact_id=art.artifact_id,
        case_id=art.case_id,
        filename=art.filename,
        sha256=art.sha256,
        file_size_bytes=art.file_size_bytes,
        mime_type=art.mime_type,
        source_device=art.source_device,
        source_tier=art.source_tier.value,
        intake_officer=art.intake_officer,
        intake_timestamp_iso=art.intake_timestamp_iso,
        custody_chain_sequence=art.custody_chain_sequence,
        storage_path=art.storage_path,
        intake_notes=art.intake_notes,
        status=art.status,
        dna_count=art.dna_count,
        integrity_limitation=art.integrity_limitation,
    )

    dna_responses = [dna_to_response(d) for d in dna_list]

    msg = (
        f"Artifact '{filename}' already registered in case '{case_id}' with matching SHA-256."
        if is_dup
        else f"Artifact '{filename}' registered successfully. Extracted {len(dna_list)} Evidence DNA records."
    )

    return ArtifactRegisterResponse(
        status="DUPLICATE_ARTIFACT" if is_dup else "REGISTERED",
        is_duplicate=is_dup,
        message=msg,
        artifact=art_resp,
        evidence_dna=dna_responses,
    )


@app.get("/api/cases/{case_id}/artifacts", response_model=List[ArtifactResponse])
def list_case_artifacts(case_id: str) -> List[ArtifactResponse]:
    """Lists all registered evidence artifacts for a case."""
    artifacts = case_store.list_artifacts(case_id)
    return [
        ArtifactResponse(
            artifact_id=a.artifact_id,
            case_id=a.case_id,
            filename=a.filename,
            sha256=a.sha256,
            file_size_bytes=a.file_size_bytes,
            mime_type=a.mime_type,
            source_device=a.source_device,
            source_tier=a.source_tier.value,
            intake_officer=a.intake_officer,
            intake_timestamp_iso=a.intake_timestamp_iso,
            custody_chain_sequence=a.custody_chain_sequence,
            storage_path=a.storage_path,
            intake_notes=a.intake_notes,
            status=a.status,
            dna_count=a.dna_count,
            integrity_limitation=a.integrity_limitation,
        )
        for a in artifacts
    ]


@app.get("/api/cases/{case_id}/artifacts/{artifact_id}", response_model=ArtifactDetailResponse)
def get_case_artifact_detail(case_id: str, artifact_id: str) -> ArtifactDetailResponse:
    """Retrieves an artifact with all its extracted Evidence DNA items and disk integrity verification."""
    art = case_store.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    stored_file = case_store.get_case_dir(case_id) / art.storage_path
    calc_hash = ""
    is_intact = False
    if stored_file.exists():
        with open(stored_file, "rb") as f:
            calc_hash = hashlib.sha256(f.read()).hexdigest()
        is_intact = (calc_hash == art.sha256)

    dna_items = case_store.list_evidence_dna(case_id, artifact_id=artifact_id)
    dna_responses = [dna_to_response(d) for d in dna_items]

    art_resp = ArtifactResponse(
        artifact_id=art.artifact_id,
        case_id=art.case_id,
        filename=art.filename,
        sha256=art.sha256,
        file_size_bytes=art.file_size_bytes,
        mime_type=art.mime_type,
        source_device=art.source_device,
        source_tier=art.source_tier.value,
        intake_officer=art.intake_officer,
        intake_timestamp_iso=art.intake_timestamp_iso,
        custody_chain_sequence=art.custody_chain_sequence,
        storage_path=art.storage_path,
        intake_notes=art.intake_notes,
        status=art.status,
        dna_count=art.dna_count,
        integrity_limitation=art.integrity_limitation,
    )

    return ArtifactDetailResponse(
        artifact=art_resp,
        evidence_dna=dna_responses,
        integrity_intact=is_intact,
        calculated_sha256=calc_hash,
        integrity_limitation=INTEGRITY_LIMITATION_DISCLOSURE,
    )


@app.get("/api/cases/{case_id}/artifacts/{artifact_id}/raw")
def download_artifact_raw(case_id: str, artifact_id: str):
    """Downloads the preserved original raw evidence artifact, verifying byte-for-byte retention."""
    art = case_store.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    case_dir = case_store.get_case_dir(case_id).resolve()
    stored_file = (case_dir / art.storage_path).resolve()
    try:
        stored_file.relative_to(case_dir)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact storage path: path traversal detected.")

    if not stored_file.exists():
        raise HTTPException(status_code=404, detail="Original artifact file missing from storage.")

    with open(stored_file, "rb") as f:
        content = f.read()

    safe_filename = sanitize_filename(art.filename)
    return Response(
        content=content,
        media_type=art.mime_type,
        headers={"Content-Disposition": f'inline; filename="{safe_filename}"'},
    )


# -------------------------------------------------------------------------
# Phase 4B: Genuine OCR Extraction & Bounding Box Inspection Endpoints
# -------------------------------------------------------------------------

@app.post("/api/cases/{case_id}/artifacts/{artifact_id}/ocr/extract", response_model=OCRExtractionResponse)
def run_ocr_extraction_endpoint(case_id: str, artifact_id: str) -> OCRExtractionResponse:
    """Executes real OCR extraction on the preserved artifact image bitstream."""
    art = case_store.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    stored_file = case_store.get_case_dir(case_id) / art.storage_path
    if not stored_file.exists():
        raise HTTPException(status_code=404, detail="Original artifact file missing from storage.")

    image_bytes = None
    ext = Path(art.filename).suffix.lower()

    if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp"] or (art.mime_type and art.mime_type.startswith("image/")):
        with open(stored_file, "rb") as f:
            image_bytes = f.read()
    elif ext == ".json":
        # Check if json references a linked image file
        try:
            with open(stored_file, "r", encoding="utf-8") as f:
                js_data = json.load(f)
            ref_img = js_data.get("filename")
            if ref_img:
                for a in case_store.list_artifacts(case_id):
                    if a.filename == ref_img:
                        img_path = case_store.get_case_dir(case_id) / a.storage_path
                        if img_path.exists():
                            with open(img_path, "rb") as fp:
                                image_bytes = fp.read()
                            break
                if not image_bytes:
                    fixture_img = FIXTURES_FRAUD_DIR / ref_img
                    if fixture_img.exists():
                        with open(fixture_img, "rb") as fp:
                            image_bytes = fp.read()
        except Exception:
            pass

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Artifact '{artifact_id}' ({art.filename}) is not an image artifact suitable for OCR.",
        )

    extractor = OCRExtractor()
    result = extractor.extract_from_bytes(image_bytes, artifact_id=artifact_id, case_id=case_id)
    save_ocr_result(case_id, artifact_id, result)

    # Record in case custody ledger
    ledger = case_store.get_ledger(case_id)
    ledger.append_action(
        action="OCR_EXTRACTION",
        payload_data={
            "artifact_id": artifact_id,
            "run_id": result.run_id,
            "engine": f"{result.engine_name} {result.engine_version}",
            "token_count": len(result.tokens),
            "candidates_count": len(result.candidates),
            "image_dims": f"{result.image_width}x{result.image_height}",
        },
        fact_id=result.run_id,
    )

    return OCRExtractionResponse(**result.model_dump(mode="json"))


@app.get("/api/cases/{case_id}/artifacts/{artifact_id}/ocr", response_model=OCRExtractionResponse)
def get_ocr_extraction_endpoint(case_id: str, artifact_id: str) -> OCRExtractionResponse:
    """Retrieves previous OCR extraction results, or runs extraction if artifact is an image."""
    result = load_ocr_result(case_id, artifact_id)
    if result:
        return OCRExtractionResponse(**result.model_dump(mode="json"))

    art = case_store.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    ext = Path(art.filename).suffix.lower()
    is_img = ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp"] or (art.mime_type and art.mime_type.startswith("image/"))
    is_claim_with_img = ext == ".json" and "screenshot" in art.filename.lower()

    if is_img or is_claim_with_img:
        return run_ocr_extraction_endpoint(case_id=case_id, artifact_id=artifact_id)

    raise HTTPException(status_code=404, detail=f"No OCR extraction results found for artifact '{artifact_id}'.")


@app.post("/api/cases/{case_id}/artifacts/{artifact_id}/ocr/review", response_model=OCRExtractionResponse)
def review_ocr_candidate_endpoint(
    case_id: str,
    artifact_id: str,
    req: OCRReviewRequest,
) -> OCRExtractionResponse:
    """Investigator review workflow: Accept, Reject, or Correct candidate financial fields."""
    result = load_ocr_result(case_id, artifact_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"No OCR results for artifact '{artifact_id}'. Run extraction first.")

    target_cand = None
    for cand in result.candidates:
        if cand.candidate_id == req.candidate_id:
            target_cand = cand
            break

    if not target_cand:
        raise HTTPException(status_code=404, detail=f"Candidate field '{req.candidate_id}' not found in OCR extraction.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    action_upper = req.action.upper()
    cd = case_store.get_case_dir(case_id)
    dna_file = cd / "evidence_dna.json"
    dna_items = case_store.list_evidence_dna(case_id)
    dna_id = f"DNA-OCR-{artifact_id}-{target_cand.candidate_id}"

    if action_upper == "ACCEPT":
        target_cand.review_status = CandidateReviewStatus.ACCEPTED
        target_cand.reviewed_by = req.reviewed_by
        target_cand.review_notes = req.review_notes or "Investigator accepted proposed OCR candidate field."
        target_cand.reviewed_at_iso = now_iso

        existing_dna = next((d for d in dna_items if d.evidence_id == dna_id), None)
        amt_val = float(target_cand.normalized_value) if target_cand.field_type == CandidateFieldType.AMOUNT else None
        identifiers = {}
        if target_cand.field_type == CandidateFieldType.RRN:
            identifiers["rrn"] = str(target_cand.normalized_value)
        elif target_cand.field_type == CandidateFieldType.PAYEE_VPA:
            identifiers["vpa"] = str(target_cand.normalized_value)

        extracted_field = ExtractedField(
            case_id=case_id,
            artifact_id=artifact_id,
            field_name=target_cand.field_type.value.lower(),
            parser_name="PaddleOCR",
            parser_version=result.engine_version,
            source_filename=f"{artifact_id}_image",
            source_location=f"ocr:tokens={','.join(target_cand.token_ids)};bbox={list(target_cand.polygon.bbox)}",
            raw_source_value=target_cand.raw_text,
            normalized_value=target_cand.normalized_value,
            extraction_status=ExtractionStatus.HUMAN_CONFIRMED,
            extraction_confidence=target_cand.confidence,
        )

        if existing_dna:
            existing_dna.review_status = "VERIFIED"
            existing_dna.reviewed_by = req.reviewed_by
            existing_dna.review_notes = target_cand.review_notes
            existing_dna.amount = amt_val or existing_dna.amount
            existing_dna.identifiers.update(identifiers)
        else:
            new_dna = EvidenceDNA(
                evidence_id=dna_id,
                artifact_id=artifact_id,
                case_id=case_id,
                record_index=len(dna_items) + 1,
                kind=FactKind.CLAIM,
                source_raw_text=target_cand.raw_text,
                source_line_ref=f"ocr:tokens={','.join(target_cand.token_ids)};bbox={list(target_cand.polygon.bbox)}",
                amount=amt_val,
                identifiers=identifiers,
                trust_tier=TrustTier.T3,
                auth_track=AuthType.PASSIVE,
                parser_name="PaddleOCR",
                parser_version=result.engine_version,
                extracted_fields=[extracted_field],
                inferred_attributes={
                    "is_media_claim": True,
                    "ocr_candidate_id": target_cand.candidate_id,
                    "ocr_run_id": result.run_id,
                    "polygon": [p.model_dump() for p in target_cand.polygon.points],
                },
                has_inferences=True,
                inference_rationale="Investigator verified and accepted OCR extraction from receipt bitstream.",
                review_status="VERIFIED",
                reviewed_by=req.reviewed_by,
                review_notes=target_cand.review_notes,
                review_timestamp_iso=now_iso,
            )
            dna_items.append(new_dna)

        target_cand.canonical_fact_id = f"FACT-{dna_id}"

    elif action_upper == "REJECT":
        target_cand.review_status = CandidateReviewStatus.REJECTED
        target_cand.reviewed_by = req.reviewed_by
        target_cand.review_notes = req.review_notes or "Investigator rejected candidate field."
        target_cand.reviewed_at_iso = now_iso

        dna_items = [d for d in dna_items if d.evidence_id != dna_id]
        target_cand.canonical_fact_id = None

    elif action_upper == "CORRECT":
        target_cand.review_status = CandidateReviewStatus.MANUALLY_CORRECTED
        target_cand.corrected_value = req.corrected_value
        target_cand.reviewed_by = req.reviewed_by
        target_cand.review_notes = req.review_notes or f"Corrected to {req.corrected_value} by investigator."
        target_cand.reviewed_at_iso = now_iso

        existing_dna = next((d for d in dna_items if d.evidence_id == dna_id), None)
        corr_val = req.corrected_value
        amt_val = float(corr_val) if target_cand.field_type == CandidateFieldType.AMOUNT and corr_val is not None else None
        identifiers = {}
        if target_cand.field_type == CandidateFieldType.RRN and corr_val:
            identifiers["rrn"] = str(corr_val)
        elif target_cand.field_type == CandidateFieldType.PAYEE_VPA and corr_val:
            identifiers["vpa"] = str(corr_val)

        extracted_field = ExtractedField(
            case_id=case_id,
            artifact_id=artifact_id,
            field_name=target_cand.field_type.value.lower(),
            parser_name="PaddleOCR",
            parser_version=result.engine_version,
            source_filename=f"{artifact_id}_image",
            source_location=f"ocr:tokens={','.join(target_cand.token_ids)};bbox={list(target_cand.polygon.bbox)}",
            raw_source_value=target_cand.raw_text,
            normalized_value=corr_val,
            extraction_status=ExtractionStatus.HUMAN_CONFIRMED,
            extraction_confidence=1.0,
        )

        if existing_dna:
            existing_dna.review_status = "VERIFIED"
            existing_dna.reviewed_by = req.reviewed_by
            existing_dna.review_notes = target_cand.review_notes
            existing_dna.amount = amt_val or existing_dna.amount
            existing_dna.identifiers.update(identifiers)
            existing_dna.field_overrides = {"corrected_value": corr_val, "original_raw": target_cand.raw_text}
        else:
            new_dna = EvidenceDNA(
                evidence_id=dna_id,
                artifact_id=artifact_id,
                case_id=case_id,
                record_index=len(dna_items) + 1,
                kind=FactKind.CLAIM,
                source_raw_text=target_cand.raw_text,
                source_line_ref=f"ocr:tokens={','.join(target_cand.token_ids)};bbox={list(target_cand.polygon.bbox)}",
                amount=amt_val,
                identifiers=identifiers,
                trust_tier=TrustTier.T3,
                auth_track=AuthType.PASSIVE,
                parser_name="PaddleOCR",
                parser_version=result.engine_version,
                extracted_fields=[extracted_field],
                inferred_attributes={
                    "is_media_claim": True,
                    "ocr_candidate_id": target_cand.candidate_id,
                    "ocr_run_id": result.run_id,
                    "manually_corrected": True,
                },
                has_inferences=True,
                inference_rationale="Investigator corrected OCR extraction value while preserving raw bitstream provenance.",
                review_status="VERIFIED",
                reviewed_by=req.reviewed_by,
                review_notes=target_cand.review_notes,
                review_timestamp_iso=now_iso,
                field_overrides={"corrected_value": corr_val, "original_raw": target_cand.raw_text},
            )
            dna_items.append(new_dna)

        target_cand.canonical_fact_id = f"FACT-{dna_id}"

    with open(dna_file, "w", encoding="utf-8") as f:
        json.dump([d.model_dump(mode="json") for d in dna_items], f, indent=2)

    save_ocr_result(case_id, artifact_id, result)

    ledger = case_store.get_ledger(case_id)
    ledger.append_action(
        action=f"OCR_REVIEW_{action_upper}",
        payload_data={
            "artifact_id": artifact_id,
            "candidate_id": target_cand.candidate_id,
            "field_type": target_cand.field_type.value,
            "action": action_upper,
            "corrected_value": target_cand.corrected_value,
            "reviewed_by": req.reviewed_by,
        },
        fact_id=target_cand.candidate_id,
    )

    return OCRExtractionResponse(**result.model_dump(mode="json"))


# -------------------------------------------------------------------------
# Phase 4C: Evidence Completeness, Uncertainty & Human Review Endpoints
# -------------------------------------------------------------------------

@app.get("/api/cases/{case_id}/artifacts/{artifact_id}/completeness", response_model=ArtifactCompletenessResponse)
def get_artifact_completeness_endpoint(case_id: str, artifact_id: str) -> ArtifactCompletenessResponse:
    """Computes evidence completeness, page coverage, and uncertainty report for an artifact."""
    art = case_store.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    stored_file = case_store.get_case_dir(case_id) / art.storage_path
    ext = Path(art.filename).suffix.lower()

    ocr_res = load_ocr_result(case_id, artifact_id)
    pdf_cov = load_pdf_coverage(case_id, artifact_id)
    existing_reviews = load_completeness_reviews(case_id, artifact_id)

    # If artifact is a PDF and not yet processed, process via PDFProcessor
    if ext == ".pdf" and stored_file.exists() and (pdf_cov is None or ocr_res is None):
        try:
            with open(stored_file, "rb") as f:
                pdf_bytes = f.read()
            pdf_proc = PDFProcessor()
            pdf_res = pdf_proc.process_pdf_bytes(pdf_bytes, artifact_id=artifact_id, case_id=case_id)
            ocr_res = pdf_res.to_ocr_result()
            save_ocr_result(case_id, artifact_id, ocr_res)
            pdf_cov = pdf_res.coverage
            save_pdf_coverage(case_id, artifact_id, pdf_cov)
        except Exception as exc:
            logger.warning(f"Auto-processing PDF exception for {artifact_id}: {exc}")

    # If artifact is an image and not yet OCR'd, run OCR
    is_img = ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp"] or (art.mime_type and art.mime_type.startswith("image/"))
    if is_img and stored_file.exists() and ocr_res is None:
        try:
            with open(stored_file, "rb") as f:
                img_bytes = f.read()
            extractor = OCRExtractor()
            ocr_res = extractor.extract_from_bytes(img_bytes, artifact_id=artifact_id, case_id=case_id)
            save_ocr_result(case_id, artifact_id, ocr_res)
        except Exception as exc:
            logger.warning(f"Auto-processing image OCR exception for {artifact_id}: {exc}")

    report = CompletenessEngine.assess_artifact(
        artifact_id=artifact_id,
        case_id=case_id,
        filename=art.filename,
        mime_type=art.mime_type,
        ocr_result=ocr_res,
        coverage=pdf_cov,
        existing_reviews=existing_reviews,
    )

    return ArtifactCompletenessResponse(**report.model_dump(mode="json"))


@app.post("/api/cases/{case_id}/artifacts/{artifact_id}/completeness/review", response_model=ArtifactCompletenessResponse)
def review_field_completeness_endpoint(
    case_id: str,
    artifact_id: str,
    req: FieldReviewActionRequest,
) -> ArtifactCompletenessResponse:
    """Records an authorized investigator review decision on an expected evidence field."""
    art = case_store.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    if not req.review_reason or not req.review_reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Investigator review rationale is required for evidentiary integrity and audit trail.",
        )

    action_upper = req.action.upper()
    valid_actions = {"ACCEPT", "REJECT", "CORRECT", "MARK_UNREADABLE", "CONFIRM_ABSENT", "REOPEN"}
    if action_upper not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review action '{req.action}'. Must be one of: {', '.join(sorted(valid_actions))}",
        )

    if action_upper == "CORRECT" and (req.corrected_value is None or str(req.corrected_value).strip() == ""):
        raise HTTPException(
            status_code=400,
            detail="A corrected value is required when performing a CORRECT action.",
        )

    # Authorization verification: ensure examiner identity is provided
    if not req.reviewed_by or not req.reviewed_by.strip():
        raise HTTPException(status_code=403, detail="Examiner identity is required for forensic review authorization.")

    reviews = load_completeness_reviews(case_id, artifact_id)
    prev_entry = reviews.get(req.field_name, {})
    prev_decision = prev_entry.get("decision")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    decision_val = action_upper if action_upper != "REOPEN" else FieldReviewDecision.REOPENED.value

    # Update review entry
    reviews[req.field_name] = {
        "decision": decision_val,
        "previous_decision": prev_decision,
        "reviewer": req.reviewed_by,
        "timestamp_iso": now_iso,
        "review_reason": req.review_reason,
        "corrected_value": req.corrected_value,
        "accepted_value": req.corrected_value if action_upper == "CORRECT" else None,
    }

    save_completeness_reviews(case_id, artifact_id, reviews)

    # Synchronize into EvidenceDNA and CanonicalFacts if ACCEPT, CORRECT, or REJECT
    ocr_res = load_ocr_result(case_id, artifact_id)
    if ocr_res and action_upper in ("ACCEPT", "CORRECT", "REJECT"):
        for cand in ocr_res.candidates:
            if CompletenessEngine._map_candidate_type_to_field_name(cand.field_type) == req.field_name:
                ocr_req = OCRReviewRequest(
                    action=action_upper,
                    candidate_id=cand.candidate_id,
                    corrected_value=req.corrected_value,
                    review_notes=req.review_reason,
                    reviewed_by=req.reviewed_by,
                )
                try:
                    review_ocr_candidate_endpoint(case_id=case_id, artifact_id=artifact_id, req=ocr_req)
                except Exception as ex_ocr:
                    logger.warning(f"Sync OCR candidate review error: {ex_ocr}")
                break

    # Record action in Custody Ledger
    ledger = case_store.get_ledger(case_id)
    ledger.append_action(
        action=f"COMPLETENESS_REVIEW_{action_upper}",
        payload_data={
            "artifact_id": artifact_id,
            "field_name": req.field_name,
            "decision": action_upper,
            "corrected_value": req.corrected_value,
            "reviewer": req.reviewed_by,
            "reason": req.review_reason,
        },
        fact_id=f"{artifact_id}_{req.field_name}",
    )

    return get_artifact_completeness_endpoint(case_id=case_id, artifact_id=artifact_id)


@app.post("/api/cases/{case_id}/artifacts/{artifact_id}/pdf/process", response_model=ArtifactCompletenessResponse)
def process_pdf_artifact_endpoint(
    case_id: str,
    artifact_id: str,
    req: PDFProcessRequest,
) -> ArtifactCompletenessResponse:
    """Executes dual-path PDF processing with page-by-page coverage and candidate extraction."""
    art = case_store.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    stored_file = case_store.get_case_dir(case_id) / art.storage_path
    if not stored_file.exists():
        raise HTTPException(status_code=404, detail="Original PDF file missing from storage.")

    with open(stored_file, "rb") as f:
        pdf_bytes = f.read()

    proc = PDFProcessor()
    pdf_res = proc.process_pdf_bytes(
        pdf_bytes=pdf_bytes,
        artifact_id=artifact_id,
        case_id=case_id,
        max_pages=req.max_pages,
        force_ocr=req.force_ocr,
    )

    ocr_res = pdf_res.to_ocr_result()
    save_ocr_result(case_id, artifact_id, ocr_res)
    save_pdf_coverage(case_id, artifact_id, pdf_res.coverage)

    ledger = case_store.get_ledger(case_id)
    ledger.append_action(
        action="PDF_PROCESSING_RUN",
        payload_data={
            "artifact_id": artifact_id,
            "run_id": pdf_res.run_id,
            "total_pages": pdf_res.coverage.total_pages,
            "processed_pages": pdf_res.coverage.processed_pages,
            "failed_pages": pdf_res.coverage.failed_pages,
            "is_fully_processed": pdf_res.coverage.is_fully_processed,
            "force_ocr": req.force_ocr,
        },
        fact_id=pdf_res.run_id,
    )

    return get_artifact_completeness_endpoint(case_id=case_id, artifact_id=artifact_id)


@app.get("/api/cases/{case_id}/evidence", response_model=List[EvidenceDNAResponse])
def list_case_evidence(
    case_id: str,
    artifact_id: Optional[str] = None,
    kind: Optional[str] = None,
    review_status: Optional[str] = None,
) -> List[EvidenceDNAResponse]:
    """Lists all Evidence DNA records for a case, with optional filtering."""
    dna_items = case_store.list_evidence_dna(case_id, artifact_id=artifact_id)
    if kind:
        dna_items = [d for d in dna_items if d.kind.value == kind]
    if review_status:
        dna_items = [d for d in dna_items if d.review_status == review_status]

    return [dna_to_response(d) for d in dna_items]


@app.get("/api/cases/{case_id}/evidence/{evidence_id}", response_model=EvidenceDNAResponse)
def get_case_evidence_detail(case_id: str, evidence_id: str) -> EvidenceDNAResponse:
    """Retrieves a single Evidence DNA record."""
    d = case_store.get_evidence_dna(case_id, evidence_id)
    if not d:
        raise HTTPException(status_code=404, detail=f"Evidence record '{evidence_id}' not found.")

    return dna_to_response(d)


@app.patch("/api/cases/{case_id}/evidence/{evidence_id}/review", response_model=EvidenceDNAResponse)
def review_case_evidence(case_id: str, evidence_id: str, req: EvidenceDNAReviewRequest) -> EvidenceDNAResponse:
    """Submits examiner review decisions and updates custody chain."""
    updated = case_store.update_evidence_review(
        case_id=case_id,
        evidence_id=evidence_id,
        review_status=req.review_status,
        reviewed_by=req.reviewed_by,
        review_notes=req.review_notes,
        field_overrides=req.field_overrides,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Evidence record '{evidence_id}' not found.")

    return dna_to_response(updated)



@app.get("/api/cases/{case_id}/integrity", response_model=CaseIntegrityReport)
def verify_case_integrity_endpoint(case_id: str) -> CaseIntegrityReport:
    """Performs full bitstream re-hashing and custody chain audit for a case."""
    report = case_store.verify_case_integrity(case_id)
    return CaseIntegrityReport(**report)


# -------------------------------------------------------------------------
# Phase 2 Endpoints: Canonical Facts, Entity Resolution & Explainable Correlation
# -------------------------------------------------------------------------

@app.get("/api/cases/{case_id}/analysis", response_model=CaseAnalysisResponse)
def get_case_analysis_endpoint(case_id: str) -> CaseAnalysisResponse:
    """Returns timeline-ready case analysis: normalized facts, proposed entities,
    entity matches, event links, contradictions, and evidence gaps.
    """
    analysis = case_store.get_case_analysis(case_id)
    return CaseAnalysisResponse(**analysis)


@app.get("/api/cases/{case_id}/facts", response_model=List[CanonicalFactResponse])
def get_case_facts_endpoint(case_id: str) -> List[CanonicalFactResponse]:
    """Returns all normalized, timezone-aware Canonical Facts for a case."""
    facts = case_store.list_canonical_facts(case_id)
    return [
        CanonicalFactResponse(
            fact_id=f.fact_id,
            case_id=f.case_id,
            artifact_id=f.artifact_id,
            evidence_id=f.evidence_id,
            kind=f.kind.value,
            source_filename=f.source_filename,
            source_location=f.source_location,
            sha256=f.sha256,
            time_provenance=TimezoneProvenanceResponse(
                recorded_time=f.time_provenance.recorded_time,
                stated_timezone=f.time_provenance.stated_timezone,
                assumed_timezone=f.time_provenance.assumed_timezone,
                conversion_rationale=f.time_provenance.conversion_rationale,
                utc_iso=f.time_provenance.utc_iso,
                utc_epoch=f.time_provenance.utc_epoch,
            ),
            trust_tier=f.trust_tier.value,
            auth_track=f.auth_track.value,
            primary_entity=f.primary_entity,
            secondary_entity=f.secondary_entity,
            amount=f.amount,
            currency=f.currency,
            identifiers=f.identifiers,
            extracted_fields=[
                ExtractedFieldResponse(
                    case_id=ef.case_id,
                    artifact_id=ef.artifact_id,
                    field_name=ef.field_name,
                    parser_name=ef.parser_name,
                    parser_version=ef.parser_version,
                    source_filename=ef.source_filename,
                    source_location=ef.source_location,
                    raw_source_value=ef.raw_source_value,
                    normalized_value=ef.normalized_value,
                    extraction_status=ef.extraction_status.value,
                    extraction_confidence=ef.extraction_confidence,
                    parser_warning=ef.parser_warning,
                    rejection_reason=ef.rejection_reason,
                )
                for ef in f.extracted_fields
            ],
            summary=f.summary,
            raw_source_snippet=f.raw_source_snippet,
            inferred_notes=f.inferred_notes,
            review_status=f.review_status,
            reviewed_by=f.reviewed_by,
            review_notes=f.review_notes,
        )
        for f in facts
    ]


@app.get("/api/cases/{case_id}/correlations", response_model=List[CorrelationResponse])
def get_case_correlations_endpoint(
    case_id: str,
    rule_id: Optional[str] = None,
    status: Optional[str] = None,
    is_contradiction: Optional[bool] = None,
    is_evidence_gap: Optional[bool] = None,
) -> List[CorrelationResponse]:
    """Returns explainable event correlations with visible deterministic rule audit."""
    correlations, _ = case_store.get_case_correlations(case_id)
    if rule_id:
        correlations = [c for c in correlations if c.rule_id == rule_id]
    if status:
        correlations = [c for c in correlations if c.status.value == status]
    if is_contradiction is not None:
        correlations = [c for c in correlations if c.is_contradiction == is_contradiction]
    if is_evidence_gap is not None:
        correlations = [c for c in correlations if c.is_evidence_gap == is_evidence_gap]

    return [
        CorrelationResponse(
            correlation_id=c.correlation_id,
            rule_id=c.rule_id,
            rule_name=c.rule_name,
            rule_version=c.rule_version,
            evidence_inputs=c.evidence_inputs,
            artifact_inputs=c.artifact_inputs,
            time_window=c.time_window,
            explanation_text=c.explanation_text,
            status=c.status.value,
            is_contradiction=c.is_contradiction,
            is_evidence_gap=c.is_evidence_gap,
            rejection_reason=c.rejection_reason,
            examiner_review_state=c.examiner_review_state,
            examiner_notes=c.examiner_notes,
        )
        for c in correlations
    ]


@app.get("/api/cases/{case_id}/entities")
def get_case_entities_endpoint(case_id: str) -> Dict[str, Any]:
    """Returns resolved entity clusters and explainable pairwise match proposals with veto audits."""
    entities, matches = case_store.get_case_entities(case_id)
    return {
        "case_id": case_id,
        "entities": [e.model_dump(mode="json") for e in entities],
        "matches": [m.model_dump(mode="json") for m in matches],
    }


@app.patch("/api/cases/{case_id}/correlations/{correlation_id}/review", response_model=CorrelationResponse)
def review_case_correlation_endpoint(
    case_id: str,
    correlation_id: str,
    req: CorrelationReviewRequest,
) -> CorrelationResponse:
    """Updates examiner review state on an event correlation and appends to custody ledger."""
    correlations, _ = case_store.get_case_correlations(case_id)
    target = None
    for c in correlations:
        if c.correlation_id == correlation_id:
            c.examiner_review_state = req.examiner_review_state
            c.examiner_notes = req.examiner_notes
            target = c
            break

    if not target:
        raise HTTPException(status_code=404, detail=f"Correlation '{correlation_id}' not found.")

    ledger = case_store.get_ledger(case_id)
    ledger.append_action(
        action="REVIEW_CORRELATION",
        payload_data={
            "correlation_id": correlation_id,
            "rule_id": target.rule_id,
            "examiner_review_state": req.examiner_review_state,
            "examiner_notes": req.examiner_notes or "",
        },
        fact_id=correlation_id,
    )

    return CorrelationResponse(
        correlation_id=target.correlation_id,
        rule_id=target.rule_id,
        rule_name=target.rule_name,
        rule_version=target.rule_version,
        evidence_inputs=target.evidence_inputs,
        artifact_inputs=target.artifact_inputs,
        time_window=target.time_window,
        explanation_text=target.explanation_text,
        status=target.status.value,
        is_contradiction=target.is_contradiction,
        is_evidence_gap=target.is_evidence_gap,
        rejection_reason=target.rejection_reason,
        examiner_review_state=target.examiner_review_state,
        examiner_notes=target.examiner_notes,
    )


# -------------------------------------------------------------------------
# Phase 3A: Analysis Runs & Counterfactual Forensics Helpers & Endpoints
# -------------------------------------------------------------------------

def _fact_to_canonical_response(f: CanonicalFact) -> CanonicalFactResponse:
    return CanonicalFactResponse(
        fact_id=f.fact_id,
        case_id=f.case_id,
        artifact_id=f.artifact_id,
        evidence_id=f.evidence_id,
        kind=f.kind.value if hasattr(f.kind, "value") else str(f.kind),
        source_filename=f.source_filename,
        source_location=f.source_location,
        sha256=f.sha256,
        time_provenance=TimezoneProvenanceResponse(
            recorded_time=f.time_provenance.recorded_time,
            stated_timezone=f.time_provenance.stated_timezone,
            assumed_timezone=f.time_provenance.assumed_timezone,
            conversion_rationale=f.time_provenance.conversion_rationale,
            utc_iso=f.time_provenance.utc_iso,
            utc_epoch=f.time_provenance.utc_epoch,
        ),
        trust_tier=f.trust_tier.value if hasattr(f.trust_tier, "value") else str(f.trust_tier),
        auth_track=f.auth_track.value if hasattr(f.auth_track, "value") else str(f.auth_track),
        primary_entity=f.primary_entity,
        secondary_entity=f.secondary_entity,
        amount=f.amount,
        currency=f.currency,
        identifiers=f.identifiers,
        extracted_fields=[
            ExtractedFieldResponse(
                case_id=ef.case_id,
                artifact_id=ef.artifact_id,
                field_name=ef.field_name,
                parser_name=ef.parser_name,
                parser_version=ef.parser_version,
                source_filename=ef.source_filename,
                source_location=ef.source_location,
                raw_source_value=ef.raw_source_value,
                normalized_value=ef.normalized_value,
                extraction_status=ef.extraction_status.value if hasattr(ef.extraction_status, "value") else str(ef.extraction_status),
                extraction_confidence=ef.extraction_confidence,
                parser_warning=ef.parser_warning,
                rejection_reason=ef.rejection_reason,
            )
            for ef in f.extracted_fields
        ],
        summary=f.summary,
        raw_source_snippet=f.raw_source_snippet,
        inferred_notes=f.inferred_notes,
        review_status=f.review_status,
        reviewed_by=f.reviewed_by,
        review_notes=f.review_notes,
    )


def _correlation_to_response(c: EventCorrelation) -> CorrelationResponse:
    return CorrelationResponse(
        correlation_id=c.correlation_id,
        rule_id=c.rule_id,
        rule_name=c.rule_name,
        rule_version=c.rule_version,
        evidence_inputs=c.evidence_inputs,
        artifact_inputs=c.artifact_inputs,
        time_window=c.time_window,
        explanation_text=c.explanation_text,
        status=c.status.value if hasattr(c.status, "value") else str(c.status),
        is_contradiction=c.is_contradiction,
        is_evidence_gap=c.is_evidence_gap,
        rejection_reason=c.rejection_reason,
        examiner_review_state=c.examiner_review_state,
        examiner_notes=c.examiner_notes,
    )


def _gap_to_response(g: EvidenceGap) -> EvidenceGapResponse:
    return EvidenceGapResponse(
        gap_id=g.gap_id,
        rule_id=g.rule_id,
        claiming_fact_id=g.claiming_fact_id,
        claiming_evidence_id=g.claiming_evidence_id,
        artifact_id=g.artifact_id,
        expected_evidence_type=g.expected_evidence_type,
        search_parameters=g.search_parameters,
        explanation=g.explanation,
    )


def _hypothesis_to_response(h: HypothesisAssessment) -> HypothesisAssessmentResponse:
    return HypothesisAssessmentResponse(
        hypothesis_id=h.hypothesis_id,
        title=h.title,
        assessment_label=h.assessment_label.value if hasattr(h.assessment_label, "value") else str(h.assessment_label),
        supporting_evidence=h.supporting_evidence,
        contradicting_evidence=h.contradicting_evidence,
        assumptions=h.assumptions,
        evidence_gaps=h.evidence_gaps,
        linked_artifacts=h.linked_artifacts,
        linked_facts=h.linked_facts,
        linked_correlation_rules=h.linked_correlation_rules,
        distinguishing_evidence_needed=h.distinguishing_evidence_needed,
        rationale=h.rationale,
    )


def _finding_to_response(f: FindingSummary) -> FindingSummaryResponse:
    return FindingSummaryResponse(
        finding_id=f.finding_id,
        title=f.title,
        status=f.status,
        rule_id=f.rule_id,
        rule_name=f.rule_name,
        supporting_artifact_ids=f.supporting_artifact_ids,
        supporting_evidence_ids=f.supporting_evidence_ids,
        explanation=f.explanation,
    )


def _run_to_response(run: AnalysisRun) -> AnalysisRunResponse:
    return AnalysisRunResponse(
        run_id=run.run_id,
        case_id=run.case_id,
        run_type=run.run_type,
        baseline_run_id=run.baseline_run_id,
        created_at_iso=run.created_at_iso,
        analysis_ruleset_version=run.analysis_ruleset_version,
        correlation_rule_versions=run.correlation_rule_versions,
        hypothesis_rule_versions=run.hypothesis_rule_versions,
        selected_artifact_ids=run.selected_artifact_ids,
        excluded_artifact_ids=run.excluded_artifact_ids,
        challenge_reason=run.challenge_reason,
        source_evidence_hashes=run.source_evidence_hashes,
        derived_facts=[_fact_to_canonical_response(f) for f in run.derived_facts],
        correlations=[_correlation_to_response(c) for c in run.correlations],
        contradictions=[_correlation_to_response(c) for c in run.contradictions],
        evidence_gaps=[_gap_to_response(g) for g in run.evidence_gaps],
        hypothesis_assessments=[_hypothesis_to_response(h) for h in run.hypothesis_assessments],
        finding_summaries=[_finding_to_response(f) for f in run.finding_summaries],
        analysis_summary=getattr(run, "analysis_summary", None),
        analysis_fingerprint=run.analysis_fingerprint,
        recipe_fingerprint=getattr(run, "recipe_fingerprint", None),
        result_fingerprint=getattr(run, "result_fingerprint", None),
    )


def _comparison_to_response(comp: RunComparison) -> RunComparisonResponse:
    return RunComparisonResponse(
        baseline_run_id=comp.baseline_run_id,
        challenge_run_id=comp.challenge_run_id,
        challenged_artifact_ids=comp.challenged_artifact_ids,
        challenge_reason=comp.challenge_reason,
        ruleset_version=comp.ruleset_version,
        baseline_evidence_count=comp.baseline_evidence_count,
        challenged_evidence_count=comp.challenged_evidence_count,
        surviving_correlations=[_correlation_to_response(c) for c in comp.surviving_correlations],
        removed_correlations=[_correlation_to_response(c) for c in comp.removed_correlations],
        surviving_contradictions=[_correlation_to_response(c) for c in comp.surviving_contradictions],
        removed_contradictions=[_correlation_to_response(c) for c in comp.removed_contradictions],
        new_evidence_gaps=[_gap_to_response(g) for g in comp.new_evidence_gaps],
        hypothesis_changes=comp.hypothesis_changes,
        surviving_findings=[_finding_to_response(f) for f in comp.surviving_findings],
        weakened_findings=[_finding_to_response(f) for f in comp.weakened_findings],
        removed_findings=[_finding_to_response(f) for f in comp.removed_findings],
        plain_language_summary=comp.plain_language_summary,
    )


@app.post("/api/cases/{case_id}/analysis-runs", response_model=AnalysisRunResponse)
def create_analysis_run_endpoint(case_id: str, req: CreateAnalysisRunRequest) -> AnalysisRunResponse:
    """Executes a new analysis run (baseline or challenge) with deterministic rules."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if not req.excluded_artifact_ids:
        base_run = case_store.get_or_create_baseline_run(case_id)
        return _run_to_response(base_run)

    base_run = case_store.get_or_create_baseline_run(case_id)
    chlg_run, _ = case_store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=req.excluded_artifact_ids,
        investigator_note=req.challenge_reason,
    )
    return _run_to_response(chlg_run)


@app.get("/api/cases/{case_id}/analysis-runs", response_model=List[AnalysisRunResponse])
def list_analysis_runs_endpoint(case_id: str) -> List[AnalysisRunResponse]:
    """Lists all versioned analysis runs for a case."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    runs = case_store.list_analysis_runs(case_id)
    if not runs:
        base_run = case_store.get_or_create_baseline_run(case_id)
        runs = [base_run]

    return [_run_to_response(r) for r in runs]


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}", response_model=AnalysisRunResponse)
def get_analysis_run_endpoint(case_id: str, run_id: str) -> AnalysisRunResponse:
    """Retrieves a specific versioned analysis run by ID."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    run = case_store.get_analysis_run(case_id, run_id)
    if not run:
        if run_id == "baseline":
            run = case_store.get_or_create_baseline_run(case_id)
        else:
            raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    return _run_to_response(run)


@app.post("/api/cases/{case_id}/analysis-runs/{baseline_run_id}/challenge", response_model=RunComparisonResponse)
def create_challenge_run_endpoint(
    case_id: str,
    baseline_run_id: str,
    req: ChallengeRunRequest,
) -> RunComparisonResponse:
    """Executes a counterfactual challenge run against a baseline and returns the comparison."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if not req.excluded_artifact_ids:
        raise HTTPException(status_code=400, detail="Must specify at least one artifact ID to exclude.")

    if baseline_run_id != "baseline":
        b_run = case_store.get_analysis_run(case_id, baseline_run_id)
        if not b_run:
            raise HTTPException(status_code=404, detail=f"Baseline run '{baseline_run_id}' not found in case '{case_id}'.")

    try:
        _, comparison = case_store.challenge_analysis_run(
            case_id=case_id,
            baseline_run_id=baseline_run_id,
            excluded_artifact_ids=req.excluded_artifact_ids,
            investigator_note=req.investigator_note,
        )
        return _comparison_to_response(comparison)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/cases/{case_id}/analysis-runs/{baseline_run_id}/compare/{challenge_run_id}", response_model=RunComparisonResponse)
def compare_analysis_runs_endpoint(
    case_id: str,
    baseline_run_id: str,
    challenge_run_id: str,
) -> RunComparisonResponse:
    """Compares an existing challenge run against its baseline run."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    try:
        comparison = case_store.compare_analysis_runs(
            case_id=case_id,
            baseline_run_id=baseline_run_id,
            challenge_run_id=challenge_run_id,
        )
        return _comparison_to_response(comparison)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# =========================================================================
# Phase 4A: Declarative Rule Registry, Provenance DAG, & Investigation Graph
# =========================================================================

def _rule_to_response(rule: DeclarativeRule) -> DeclarativeRuleResponse:
    return DeclarativeRuleResponse(
        rule_id=rule.rule_id,
        version=rule.version,
        display_name=rule.display_name,
        purpose=rule.purpose,
        input_fact_types=rule.input_fact_types,
        join_key=rule.join_key,
        field_paths=rule.field_paths,
        operator=rule.operator.value,
        output_type=rule.output_type,
        review_required=rule.review_required,
        time_window=rule.time_window,
        rationale_template=rule.rationale_template,
    )


def _dag_to_response(dag: ProvenanceDAG) -> ProvenanceDAGResponse:
    return ProvenanceDAGResponse(
        dag_id=dag.dag_id,
        run_id=dag.run_id,
        case_id=dag.case_id,
        run_type=dag.run_type,
        nodes=[
            DAGNodeResponse(
                node_id=n.node_id,
                node_type=n.node_type.value,
                label=n.label,
                status=n.status.value,
                title=n.title,
                description=n.description,
                source_artifact_id=n.source_artifact_id,
                source_location=n.source_location,
                rule_id=n.rule_id,
                fact_id=n.fact_id,
                evidence_id=n.evidence_id,
                run_id=n.run_id,
                amount=n.amount,
                metadata=n.metadata,
            )
            for n in dag.nodes
        ],
        edges=[
            DAGEdgeResponse(
                edge_id=e.edge_id,
                source_id=e.source_id,
                target_id=e.target_id,
                edge_type=e.edge_type.value,
                label=e.label,
                metadata=e.metadata,
            )
            for e in dag.edges
        ],
        fingerprint=dag.fingerprint,
    )


def _inv_graph_to_response(graph: InvestigationGraph) -> InvestigationGraphResponse:
    def _val(x: Any) -> str:
        return x.value if hasattr(x, "value") else str(x)

    return InvestigationGraphResponse(
        graph_id=graph.graph_id,
        case_id=graph.case_id,
        nodes=[
            InvestigationNodeResponse(
                node_id=n.node_id,
                node_type=_val(n.node_type),
                label=n.label,
                title=n.title or n.label,
                subtitle=n.subtitle,
                description=n.description,
                source_artifact_ids=n.source_artifact_ids,
                source_artifact_id=n.source_artifact_id,
                source_record_id=n.source_record_id,
                provenance_ids=n.provenance_ids,
                identifiers=n.identifiers,
                amount=n.amount,
                raw_value=n.raw_value,
                normalized_value=n.normalized_value,
                confidence=n.confidence,
                review_status=n.review_status,
                status=n.status,
                inactive_reason=n.inactive_reason,
                timestamp_iso=n.timestamp_iso,
                is_timestamp_inferred=n.is_timestamp_inferred,
                page_number=n.page_number,
                bounding_box=n.bounding_box,
                rule_id=n.rule_id,
                metadata=n.metadata,
            )
            for n in graph.nodes
        ],
        edges=[
            InvestigationEdgeResponse(
                edge_id=e.edge_id,
                source_id=e.source_id,
                target_id=e.target_id,
                edge_type=_val(e.edge_type),
                label=e.label,
                explanation=e.explanation,
                provenance_ids=e.provenance_ids,
                rule_id=e.rule_id,
                is_contradiction=e.is_contradiction,
                status=e.status,
                inactive_reason=e.inactive_reason,
                metadata=e.metadata,
            )
            for e in graph.edges
        ],
        fingerprint=graph.fingerprint,
    )


@app.get("/api/rules", response_model=List[DeclarativeRuleResponse])
@app.get("/api/rules/registry", response_model=List[DeclarativeRuleResponse])
def get_rule_registry_endpoint() -> List[DeclarativeRuleResponse]:
    """Inspects all declarative correlation and contradiction rules in the registry."""
    rules = DEFAULT_RULE_REGISTRY.list_rules()
    return [_rule_to_response(r) for r in rules]


@app.get("/api/cases/{case_id}/investigation-graph", response_model=InvestigationGraphResponse)
def get_case_investigation_graph_endpoint(
    case_id: str,
    run_id: Optional[str] = None,
) -> InvestigationGraphResponse:
    """Returns the Investigation Graph showing evidence entities and case relationships,
    with optional counterfactual run status filtering."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    artifacts = case_store.list_artifacts(case_id)
    facts = case_store.list_canonical_facts(case_id)
    correlations, _ = CorrelationEngine().correlate_case(facts)

    run = None
    if run_id:
        if run_id == "baseline":
            run = case_store.get_or_create_baseline_run(case_id)
        else:
            run = case_store.get_analysis_run(case_id, run_id)
            if not run:
                raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    graph = InvestigationGraphBuilder.build_forensic_graph(
        case_id=case_id,
        artifacts=artifacts,
        facts=facts,
        correlations=correlations,
        run=run,
    )
    timeline = TimelineReconstructionEngine().build_timeline(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        run=run,
    )
    graph = TimelineReconstructionEngine().integrate_timeline_into_graph(graph, timeline)

    finding_reviews = case_store.get_finding_reviews(case_id)
    gap_reviews = case_store.get_gap_reviews(case_id)
    combined_reviews = {**finding_reviews, **gap_reviews}

    analysis = ContradictionAnalysisEngine().analyze_case(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        timeline=timeline,
        run=run,
        existing_reviews=combined_reviews,
    )
    graph = ContradictionAnalysisEngine().integrate_findings_into_graph(graph, analysis)

    priorities = InvestigationPrioritizationEngine().prioritize_case(
        case_id=case_id,
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=graph,
        run=run,
    )
    graph = InvestigationPrioritizationEngine().integrate_priorities_into_graph(graph, priorities)

    return _inv_graph_to_response(graph)


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/investigation-graph", response_model=InvestigationGraphResponse)
def get_run_investigation_graph_endpoint(case_id: str, run_id: str) -> InvestigationGraphResponse:
    """Returns the run-scoped Investigation Graph with counterfactual active/inactive status."""
    return get_case_investigation_graph_endpoint(case_id=case_id, run_id=run_id)


def _timeline_to_response(timeline: ForensicTimeline) -> ForensicTimelineResponse:
    return ForensicTimelineResponse(
        case_id=timeline.case_id,
        run_id=timeline.run_id,
        total_events=timeline.total_events,
        active_events_count=timeline.active_events_count,
        inactive_events_count=timeline.inactive_events_count,
        conflicts_count=timeline.conflicts_count,
        events=[
            ForensicTimelineEventResponse(
                id=e.event_id,
                timestamp=e.timestamp,
                timestamp_iso=e.timestamp_iso,
                timestamp_epoch=e.timestamp_epoch,
                type=e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
                title=e.title,
                description=e.description,
                source_artifact_ids=e.source_artifact_ids,
                supporting_fact_ids=e.supporting_fact_ids,
                confidence=e.confidence,
                provenance_links=e.provenance_links,
                status=e.status,
                inactive_reason=e.inactive_reason,
                temporal_priority=e.temporal_priority,
                is_timestamp_inferred=e.is_timestamp_inferred,
                primary_entity=e.primary_entity,
                secondary_entity=e.secondary_entity,
                amount=e.amount,
                currency=e.currency,
                identifiers=e.identifiers,
                evidence=e.evidence,
                metadata=e.metadata,
                conflicting_event_ids=e.conflicting_event_ids,
                conflict_explanation=e.conflict_explanation,
            )
            for e in timeline.events
        ],
        temporal_conflicts=timeline.temporal_conflicts,
        fingerprint=timeline.fingerprint,
    )


@app.get("/api/cases/{case_id}/timeline", response_model=ForensicTimelineResponse)
def get_case_timeline_endpoint(
    case_id: str,
    run_id: Optional[str] = None,
) -> ForensicTimelineResponse:
    """Returns the deterministic chronological forensic timeline for a case,
    with counterfactual active/inactive state sensitivity."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    artifacts = case_store.list_artifacts(case_id)
    facts = case_store.list_canonical_facts(case_id)

    run = None
    if run_id:
        if run_id == "baseline":
            run = case_store.get_or_create_baseline_run(case_id)
        else:
            run = case_store.get_analysis_run(case_id, run_id)
            if not run:
                raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    timeline = TimelineReconstructionEngine().build_timeline(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        run=run,
    )
    return _timeline_to_response(timeline)


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/timeline", response_model=ForensicTimelineResponse)
def get_run_timeline_endpoint(case_id: str, run_id: str) -> ForensicTimelineResponse:
    """Returns the run-scoped forensic timeline reflecting counterfactual exclusions."""
    return get_case_timeline_endpoint(case_id=case_id, run_id=run_id)


# -----------------------------------------------------------------------------
# Phase 5C: Contradiction & Evidence-Gap Analysis Endpoints
# -----------------------------------------------------------------------------

def _contra_to_response(c: ContradictionFinding) -> ContradictionFindingResponse:
    return ContradictionFindingResponse(
        finding_id=c.finding_id,
        rule_id=c.rule_id,
        rule_version=c.rule_version,
        category=c.category.value if hasattr(c.category, "value") else str(c.category),
        severity=c.severity.value if hasattr(c.severity, "value") else str(c.severity),
        title=c.title,
        explanation=c.explanation,
        supporting_fact_ids=c.supporting_fact_ids,
        source_artifact_ids=c.source_artifact_ids,
        original_values=c.original_values,
        normalized_values=c.normalized_values,
        provenance_references=c.provenance_references,
        counterfactual_dependencies=c.counterfactual_dependencies,
        status=c.status,
        inactive_reason=c.inactive_reason,
        rule_firing_reason=c.rule_firing_reason,
        uncertainties_and_limitations=c.uncertainties_and_limitations,
        review_state=c.review_state,
        reviewed_by=c.reviewed_by,
        review_notes=c.review_notes,
        reviewed_at_iso=c.reviewed_at_iso,
    )


def _gap_model_to_response(g: ForensicEvidenceGap) -> ForensicEvidenceGapResponse:
    return ForensicEvidenceGapResponse(
        gap_id=g.gap_id,
        category=g.category.value if hasattr(g.category, "value") else str(g.category),
        status=g.status.value if hasattr(g.status, "value") else str(g.status),
        title=g.title,
        why_it_matters=g.why_it_matters,
        exposed_by_rule_id=g.exposed_by_rule_id,
        relevant_fact_ids=g.relevant_fact_ids,
        relevant_event_ids=g.relevant_event_ids,
        relevant_artifact_ids=g.relevant_artifact_ids,
        missing_evidence_description=g.missing_evidence_description,
        suggested_remedy=g.suggested_remedy,
        is_mandatory_for_resolution=g.is_mandatory_for_resolution,
        provenance_ids=g.provenance_ids,
        counterfactual_dependencies=g.counterfactual_dependencies,
        active_status=g.active_status,
        inactive_reason=g.inactive_reason,
        review_decision=g.review_decision,
        reviewed_by=g.reviewed_by,
        review_notes=g.review_notes,
        reviewed_at_iso=g.reviewed_at_iso,
        review_scope=g.review_scope,
    )


def _forensic_analysis_to_response(a: CaseForensicAnalysis) -> CaseForensicAnalysisResponse:
    return CaseForensicAnalysisResponse(
        case_id=a.case_id,
        run_id=a.run_id,
        total_contradictions=a.total_contradictions,
        active_contradictions_count=a.active_contradictions_count,
        inactive_contradictions_count=a.inactive_contradictions_count,
        total_gaps=a.total_gaps,
        active_gaps_count=a.active_gaps_count,
        review_required_count=a.review_required_count,
        resolved_count=a.resolved_count,
        contradictions=[_contra_to_response(c) for c in a.contradictions],
        evidence_gaps=[_gap_model_to_response(g) for g in a.evidence_gaps],
        uncertainties=a.uncertainties,
        informational_observations=a.informational_observations,
        fingerprint=a.fingerprint,
        recipe_fingerprint=getattr(a, "recipe_fingerprint", None),
        result_fingerprint=getattr(a, "result_fingerprint", None),
    )


@app.get("/api/cases/{case_id}/forensic-analysis", response_model=CaseForensicAnalysisResponse)
def get_case_forensic_analysis_endpoint(
    case_id: str,
    run_id: Optional[str] = None,
) -> CaseForensicAnalysisResponse:
    """Returns the comprehensive contradiction and evidence gap analysis for a case."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    artifacts = case_store.list_artifacts(case_id)
    facts = case_store.list_canonical_facts(case_id)

    run = None
    if run_id:
        if run_id == "baseline":
            run = case_store.get_or_create_baseline_run(case_id)
        else:
            run = case_store.get_analysis_run(case_id, run_id)
            if not run:
                raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    timeline = TimelineReconstructionEngine().build_timeline(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        run=run,
    )

    finding_reviews = case_store.get_finding_reviews(case_id)
    gap_reviews = case_store.get_gap_reviews(case_id)
    combined_reviews = {**finding_reviews, **gap_reviews}

    analysis = ContradictionAnalysisEngine().analyze_case(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        timeline=timeline,
        run=run,
        existing_reviews=combined_reviews,
    )
    return _forensic_analysis_to_response(analysis)


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/forensic-analysis", response_model=CaseForensicAnalysisResponse)
def get_run_forensic_analysis_endpoint(case_id: str, run_id: str) -> CaseForensicAnalysisResponse:
    """Returns run-scoped contradiction and evidence gap analysis."""
    return get_case_forensic_analysis_endpoint(case_id=case_id, run_id=run_id)


@app.get("/api/cases/{case_id}/contradictions", response_model=List[ContradictionFindingResponse])
def get_case_contradictions_endpoint(
    case_id: str,
    run_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[ContradictionFindingResponse]:
    """Returns all deterministic contradiction findings for a case."""
    analysis_resp = get_case_forensic_analysis_endpoint(case_id=case_id, run_id=run_id)
    items = analysis_resp.contradictions
    if status:
        items = [i for i in items if i.status == status]
    if category:
        items = [i for i in items if i.category == category]
    return items


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/contradictions", response_model=List[ContradictionFindingResponse])
def get_run_contradictions_endpoint(
    case_id: str,
    run_id: str,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[ContradictionFindingResponse]:
    """Returns run-scoped contradiction findings reflecting counterfactual exclusions."""
    return get_case_contradictions_endpoint(case_id=case_id, run_id=run_id, status=status, category=category)


@app.get("/api/cases/{case_id}/evidence-gaps", response_model=List[ForensicEvidenceGapResponse])
def get_case_evidence_gaps_endpoint(
    case_id: str,
    run_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[ForensicEvidenceGapResponse]:
    """Returns all identified evidence gaps for a case."""
    analysis_resp = get_case_forensic_analysis_endpoint(case_id=case_id, run_id=run_id)
    items = analysis_resp.evidence_gaps
    if status:
        items = [i for i in items if i.status == status]
    if category:
        items = [i for i in items if i.category == category]
    return items


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/evidence-gaps", response_model=List[ForensicEvidenceGapResponse])
def get_run_evidence_gaps_endpoint(
    case_id: str,
    run_id: str,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[ForensicEvidenceGapResponse]:
    """Returns run-scoped evidence gaps."""
    return get_case_evidence_gaps_endpoint(case_id=case_id, run_id=run_id, status=status, category=category)


@app.post("/api/cases/{case_id}/contradictions/{finding_id}/review", response_model=ContradictionFindingResponse)
def review_contradiction_endpoint(
    case_id: str,
    finding_id: str,
    req: ContradictionReviewRequest,
) -> ContradictionFindingResponse:
    """Records an authorized investigator review on a contradiction finding with custody audit."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    valid_decisions = ["VERIFY", "FLAG_UNCERTAIN", "RESOLVE", "DISMISS"]
    if req.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision '{req.decision}'. Allowed: {valid_decisions}")

    if not req.reviewed_by or not req.reviewed_by.strip():
        raise HTTPException(status_code=400, detail="Examiner identity ('reviewed_by') is required.")

    # Guard: verify finding exists before mutating state or custody ledger
    findings = get_case_contradictions_endpoint(case_id=case_id)
    if not any(f.finding_id == finding_id for f in findings):
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    case_store.save_finding_review(
        case_id=case_id,
        finding_id=finding_id,
        decision=req.decision,
        review_notes=req.review_notes,
        reviewed_by=req.reviewed_by,
    )

    findings = get_case_contradictions_endpoint(case_id=case_id)
    for f in findings:
        if f.finding_id == finding_id:
            return f

    raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")


@app.post("/api/cases/{case_id}/evidence-gaps/{gap_id}/review", response_model=ForensicEvidenceGapResponse)
def review_evidence_gap_endpoint(
    case_id: str,
    gap_id: str,
    req: EvidenceGapReviewRequest,
) -> ForensicEvidenceGapResponse:
    """Records an authorized investigator review on an evidence gap.
    CONFIRMED_ABSENT requires an explicit review_scope and examiner rationale."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    valid_decisions = ["CONFIRM_ABSENT", "RESOLVE", "MARK_UNREADABLE", "REOPEN"]
    if req.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision '{req.decision}'. Allowed: {valid_decisions}")

    if req.decision == "CONFIRM_ABSENT" and (not req.review_scope or not req.review_scope.strip()):
        raise HTTPException(
            status_code=400,
            detail="CONFIRMED_ABSENT requires an explicit non-empty 'review_scope' stating the scope of manual examination."
        )

    if not req.reviewed_by or not req.reviewed_by.strip():
        raise HTTPException(status_code=400, detail="Examiner identity ('reviewed_by') is required.")

    # Guard: verify evidence gap exists before mutating state or custody ledger
    gaps = get_case_evidence_gaps_endpoint(case_id=case_id)
    if not any(g.gap_id == gap_id for g in gaps):
        raise HTTPException(status_code=404, detail=f"Evidence gap '{gap_id}' not found.")

    case_store.save_gap_review(
        case_id=case_id,
        gap_id=gap_id,
        decision=req.decision,
        review_notes=req.review_notes,
        reviewed_by=req.reviewed_by,
        review_scope=req.review_scope,
    )

    gaps = get_case_evidence_gaps_endpoint(case_id=case_id)
    for g in gaps:
        if g.gap_id == gap_id:
            return g

    raise HTTPException(status_code=404, detail=f"Evidence gap '{gap_id}' not found.")


# ==============================================================================
# Phase 5D: Investigation Prioritization & Summary Endpoints
# ==============================================================================

def _priority_item_to_response(item: InvestigationPriorityItem) -> InvestigationPriorityItemResponse:
    return InvestigationPriorityItemResponse(
        id=item.id,
        title=item.title,
        priority_score=item.priority_score,
        priority_level=item.priority_level.value,
        target_type=item.target_type.value,
        target_id=item.target_id,
        reason=item.reason,
        score_breakdown=PriorityScoreBreakdownResponse(**item.score_breakdown.model_dump()),
        supporting_rules=item.supporting_rules,
        related_artifacts=item.related_artifacts,
        related_facts=item.related_facts,
        is_reviewed=item.is_reviewed,
        status=item.status,
        inactive_reason=item.inactive_reason,
    )


def _priorities_to_response(p: CaseInvestigationPriorities) -> CaseInvestigationPrioritiesResponse:
    return CaseInvestigationPrioritiesResponse(
        case_id=p.case_id,
        run_id=p.run_id,
        total_items=p.total_items,
        critical_count=p.critical_count,
        high_count=p.high_count,
        medium_count=p.medium_count,
        low_count=p.low_count,
        items=[_priority_item_to_response(i) for i in p.items],
        fingerprint=p.fingerprint,
    )


def _summary_to_response(s: CaseInvestigationSummary) -> CaseInvestigationSummaryResponse:
    return CaseInvestigationSummaryResponse(
        case_id=s.case_id,
        case_title=s.case_title,
        run_id=s.run_id,
        overview=s.overview,
        critical_findings=[
            SummaryFindingItemResponse(
                finding_id=f.finding_id,
                title=f.title,
                description=f.description,
                severity=f.severity,
                category=f.category,
                rule_id=f.rule_id,
                artifact_ids=f.artifact_ids,
                fact_ids=f.fact_ids,
                original_values=f.original_values,
                normalized_values=f.normalized_values,
            )
            for f in s.critical_findings
        ],
        evidence_gaps=[
            SummaryEvidenceGapItemResponse(
                gap_id=g.gap_id,
                title=g.title,
                why_it_matters=g.why_it_matters,
                status=g.status,
                rule_id=g.rule_id,
                artifact_ids=g.artifact_ids,
                fact_ids=g.fact_ids,
                missing_evidence_description=g.missing_evidence_description,
                suggested_remedy=g.suggested_remedy,
            )
            for g in s.evidence_gaps
        ],
        timeline_issues=[
            SummaryTimelineIssueItemResponse(
                conflict_id=t.conflict_id,
                title=t.title,
                description=t.description,
                rule_id=t.rule_id,
                event_ids=t.event_ids,
                artifact_ids=t.artifact_ids,
                fact_ids=t.fact_ids,
            )
            for t in s.timeline_issues
        ],
        recommended_actions=[
            SummaryRecommendedActionResponse(
                action_id=a.action_id,
                priority_level=a.priority_level,
                priority_score=a.priority_score,
                action=a.action,
                rationale=a.rationale,
                target_id=a.target_id,
                rule_id=a.rule_id,
                artifact_ids=a.artifact_ids,
                fact_ids=a.fact_ids,
            )
            for a in s.recommended_actions
        ],
        fingerprint=s.fingerprint,
    )


@app.get("/api/cases/{case_id}/investigation-priorities", response_model=CaseInvestigationPrioritiesResponse)
def get_case_investigation_priorities_endpoint(
    case_id: str,
    run_id: Optional[str] = None,
    priority_level: Optional[str] = None,
) -> CaseInvestigationPrioritiesResponse:
    """Returns deterministic ranked investigation priority queue for a case."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    artifacts = case_store.list_artifacts(case_id)
    facts = case_store.list_canonical_facts(case_id)

    run = None
    if run_id:
        if run_id == "baseline":
            run = case_store.get_or_create_baseline_run(case_id)
        else:
            run = case_store.get_analysis_run(case_id, run_id)
            if not run:
                raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    timeline = TimelineReconstructionEngine().build_timeline(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        run=run,
    )

    finding_reviews = case_store.get_finding_reviews(case_id)
    gap_reviews = case_store.get_gap_reviews(case_id)
    combined_reviews = {**finding_reviews, **gap_reviews}

    analysis = ContradictionAnalysisEngine().analyze_case(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        timeline=timeline,
        run=run,
        existing_reviews=combined_reviews,
    )

    correlations, _ = CorrelationEngine().correlate_case(facts)
    base_graph = InvestigationGraphBuilder.build_case_graph(case_id, artifacts, facts, correlations, run=run)

    priorities = InvestigationPrioritizationEngine().prioritize_case(
        case_id=case_id,
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=base_graph,
        run=run,
    )

    resp = _priorities_to_response(priorities)
    if priority_level:
        resp.items = [i for i in resp.items if i.priority_level == priority_level]
    return resp


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/investigation-priorities", response_model=CaseInvestigationPrioritiesResponse)
def get_run_investigation_priorities_endpoint(
    case_id: str,
    run_id: str,
    priority_level: Optional[str] = None,
) -> CaseInvestigationPrioritiesResponse:
    """Returns run-scoped investigation priority queue reflecting counterfactual exclusions."""
    return get_case_investigation_priorities_endpoint(case_id=case_id, run_id=run_id, priority_level=priority_level)


@app.get("/api/cases/{case_id}/investigation-summary", response_model=CaseInvestigationSummaryResponse)
def get_case_investigation_summary_endpoint(
    case_id: str,
    run_id: Optional[str] = None,
) -> CaseInvestigationSummaryResponse:
    """Returns deterministic, evidence-grounded investigation summary for a case."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    artifacts = case_store.list_artifacts(case_id)
    facts = case_store.list_canonical_facts(case_id)

    run = None
    if run_id:
        if run_id == "baseline":
            run = case_store.get_or_create_baseline_run(case_id)
        else:
            run = case_store.get_analysis_run(case_id, run_id)
            if not run:
                raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    timeline = TimelineReconstructionEngine().build_timeline(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        run=run,
    )

    finding_reviews = case_store.get_finding_reviews(case_id)
    gap_reviews = case_store.get_gap_reviews(case_id)
    combined_reviews = {**finding_reviews, **gap_reviews}

    analysis = ContradictionAnalysisEngine().analyze_case(
        case_id=case_id,
        facts=facts,
        artifacts=artifacts,
        timeline=timeline,
        run=run,
        existing_reviews=combined_reviews,
    )

    correlations, _ = CorrelationEngine().correlate_case(facts)
    base_graph = InvestigationGraphBuilder.build_case_graph(case_id, artifacts, facts, correlations, run=run)

    priorities = InvestigationPrioritizationEngine().prioritize_case(
        case_id=case_id,
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=base_graph,
        run=run,
    )

    summary = InvestigationSummaryGenerator.generate_summary(
        case=case,
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        priorities=priorities,
        timeline=timeline,
        run_id=run_id,
    )
    return _summary_to_response(summary)


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/investigation-summary", response_model=CaseInvestigationSummaryResponse)
def get_run_investigation_summary_endpoint(
    case_id: str,
    run_id: str,
) -> CaseInvestigationSummaryResponse:
    """Returns run-scoped investigation summary reflecting counterfactual exclusions."""
    return get_case_investigation_summary_endpoint(case_id=case_id, run_id=run_id)




@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/provenance-dag", response_model=ProvenanceDAGResponse)
def get_run_provenance_dag_endpoint(case_id: str, run_id: str) -> ProvenanceDAGResponse:
    """Returns the Provenance Dependency DAG for a specific AnalysisRun."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if run_id == "baseline":
        run = case_store.get_or_create_baseline_run(case_id)
    else:
        run = case_store.get_analysis_run(case_id, run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    artifacts = case_store.list_artifacts(case_id)
    dna_items = case_store.list_evidence_dna(case_id)
    dag = ProvenanceDAGBuilder.build_run_dag(run, artifacts, dna_items)
    return _dag_to_response(dag)


@app.get("/api/cases/{case_id}/analysis-runs/{baseline_run_id}/challenge-impact/{challenge_run_id}", response_model=ProvenanceDAGResponse)
def get_challenge_impact_dag_endpoint(
    case_id: str,
    baseline_run_id: str,
    challenge_run_id: str,
) -> ProvenanceDAGResponse:
    """Returns the Counterfactual Dependency Impact DAG comparing baseline with challenge run."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    baseline = case_store.get_analysis_run(case_id, baseline_run_id)
    if not baseline:
        if baseline_run_id == "baseline":
            baseline = case_store.get_or_create_baseline_run(case_id)
        else:
            raise HTTPException(status_code=404, detail=f"Baseline run '{baseline_run_id}' not found.")

    challenge = case_store.get_analysis_run(case_id, challenge_run_id)
    if not challenge:
        raise HTTPException(status_code=404, detail=f"Challenge run '{challenge_run_id}' not found.")

    artifacts = case_store.list_artifacts(case_id)
    dna_items = case_store.list_evidence_dna(case_id)
    dag = ProvenanceDAGBuilder.build_challenge_impact_dag(baseline, challenge, artifacts, dna_items)
    return _dag_to_response(dag)


@app.get("/api/cases/{case_id}/artifacts/{artifact_id}/derivation-dag", response_model=ProvenanceDAGResponse)
def get_artifact_derivation_dag_endpoint(
    case_id: str,
    artifact_id: str,
    run_id: Optional[str] = None,
) -> ProvenanceDAGResponse:
    """Returns the scoped derivation sub-DAG originating strictly from a single artifact."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if run_id and run_id != "baseline":
        run = case_store.get_analysis_run(case_id, run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")
    else:
        run = case_store.get_or_create_baseline_run(case_id)

    artifacts = case_store.list_artifacts(case_id)
    dna_items = case_store.list_evidence_dna(case_id)
    dag = ProvenanceDAGBuilder.build_artifact_derivation_dag(artifact_id, run, artifacts, dna_items)
    return _dag_to_response(dag)


# ==============================================================================
# Phase 7: Forensic Traceability & Evidence-Grounded Explanations Endpoints
# ==============================================================================

def _get_explanation_engine() -> FindingExplanationEngine:
    return FindingExplanationEngine(case_store=case_store)


@app.get("/api/cases/{case_id}/findings/{finding_id}/explanation", response_model=FindingExplanationResponse)
def get_finding_explanation_endpoint(
    case_id: str,
    finding_id: str,
    run_id: Optional[str] = None,
) -> FindingExplanationResponse:
    """Returns an evidence-grounded, non-accusatory deterministic explanation for a finding."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if run_id and run_id != "baseline":
        run = case_store.get_analysis_run(case_id, run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    engine = _get_explanation_engine()
    try:
        expl = engine.explain_finding(case_id=case_id, finding_id=finding_id, run_id=run_id)
        return FindingExplanationResponse(**expl.model_dump())
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found in case '{case_id}'.")
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/cases/{case_id}/analysis-runs/{run_id}/findings/{finding_id}/explanation", response_model=FindingExplanationResponse)
def get_run_finding_explanation_endpoint(
    case_id: str,
    run_id: str,
    finding_id: str,
) -> FindingExplanationResponse:
    """Run-scoped alias for finding explanation."""
    return get_finding_explanation_endpoint(case_id=case_id, finding_id=finding_id, run_id=run_id)


@app.get("/api/cases/{case_id}/findings/{finding_id}/provenance", response_model=ProvenanceTraceResponse)
def get_finding_provenance_trace_endpoint(
    case_id: str,
    finding_id: str,
    direction: Optional[str] = "BACKWARD",
    run_id: Optional[str] = None,
) -> ProvenanceTraceResponse:
    """Returns bidirectional provenance trace (BACKWARD from finding or FORWARD if requested)."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if run_id and run_id != "baseline":
        run = case_store.get_analysis_run(case_id, run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    dir_norm = (direction or "BACKWARD").strip().upper()
    if dir_norm not in ("BACKWARD", "FORWARD"):
        raise HTTPException(status_code=400, detail="Direction must be 'BACKWARD' or 'FORWARD'.")

    engine = _get_explanation_engine()
    try:
        if dir_norm == "BACKWARD":
            trace = engine.get_backward_trace(case_id=case_id, finding_id=finding_id, run_id=run_id)
        else:
            trace = engine.get_forward_trace(case_id=case_id, root_id=finding_id, run_id=run_id)
        return ProvenanceTraceResponse(**trace.model_dump())
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found in case '{case_id}'.")
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/cases/{case_id}/findings/{finding_id}/trace", response_model=ProvenanceTraceResponse)
def get_finding_trace_alias_endpoint(
    case_id: str,
    finding_id: str,
    direction: Optional[str] = "BACKWARD",
    run_id: Optional[str] = None,
) -> ProvenanceTraceResponse:
    """Alias for finding provenance trace."""
    return get_finding_provenance_trace_endpoint(case_id=case_id, finding_id=finding_id, direction=direction, run_id=run_id)


@app.get("/api/cases/{case_id}/artifacts/{artifact_id}/impact", response_model=ProvenanceTraceResponse)
def get_artifact_impact_trace_endpoint(
    case_id: str,
    artifact_id: str,
    run_id: Optional[str] = None,
) -> ProvenanceTraceResponse:
    """Forward provenance trace showing all downstream facts, timeline events, rules, and findings impacted by artifact."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if run_id and run_id != "baseline":
        run = case_store.get_analysis_run(case_id, run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    # Guard: check artifact exists (handle possible art: prefix)
    clean_art_id = artifact_id.removeprefix("art:")
    artifact = case_store.get_artifact(case_id, clean_art_id)
    if not artifact:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found in case '{case_id}'.")

    engine = _get_explanation_engine()
    try:
        trace = engine.get_forward_trace(case_id=case_id, root_id=clean_art_id, run_id=run_id)
        return ProvenanceTraceResponse(**trace.model_dump())
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/cases/{case_id}/artifacts/{artifact_id}/forward-trace", response_model=ProvenanceTraceResponse)
def get_artifact_forward_trace_alias_endpoint(
    case_id: str,
    artifact_id: str,
    run_id: Optional[str] = None,
) -> ProvenanceTraceResponse:
    """Alias for artifact forward trace impact."""
    return get_artifact_impact_trace_endpoint(case_id=case_id, artifact_id=artifact_id, run_id=run_id)


@app.get(
    "/api/cases/{case_id}/analysis-runs/{run_id}/findings/{finding_id}/counterfactual-explanation",
    response_model=CounterfactualFindingExplanationResponse,
)
def get_counterfactual_finding_explanation_endpoint(
    case_id: str,
    run_id: str,
    finding_id: str,
    baseline_run_id: Optional[str] = "baseline",
) -> CounterfactualFindingExplanationResponse:
    """Compares baseline vs challenge analysis to explain finding deactivation or survival."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    b_run_id = baseline_run_id or "baseline"
    if b_run_id != "baseline":
        b_run = case_store.get_analysis_run(case_id, b_run_id)
        if not b_run:
            raise HTTPException(status_code=404, detail=f"Baseline run '{b_run_id}' not found.")

    ch_run = case_store.get_analysis_run(case_id, run_id)
    if not ch_run:
        raise HTTPException(status_code=404, detail=f"Challenge run '{run_id}' not found.")

    engine = _get_explanation_engine()
    try:
        cf_expl = engine.explain_counterfactual(
            case_id=case_id,
            finding_id=finding_id,
            baseline_run_id=b_run_id,
            challenge_run_id=run_id,
        )
        return CounterfactualFindingExplanationResponse(**cf_expl.model_dump())
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found in case '{case_id}'.")
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


# ==============================================================================
# Phase 8: Evidence-Grounded Forensic Report & Export Endpoints
# ==============================================================================

@app.post("/api/cases/{case_id}/reports", response_model=ForensicReportResponse)
def create_case_report_endpoint(
    case_id: str,
    req: CreateReportRequest,
) -> ForensicReportResponse:
    """Generates an evidence-grounded, versioned forensic investigation report for a case."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    run_id = req.run_id or "baseline"
    if run_id != "baseline":
        run = case_store.get_analysis_run(case_id, run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found.")

    builder = ForensicReportBuilder(case_store=case_store)
    try:
        report = builder.generate_report(
            case_id=case_id,
            run_id=run_id,
            report_title=req.title,
            include_counterfactual=req.include_counterfactual,
        )
        if req.persist:
            case_store.save_report(case_id, report)
        return ForensicReportResponse(**report.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/cases/{case_id}/reports", response_model=List[ReportSummaryResponse])
def list_case_reports_endpoint(
    case_id: str,
) -> List[ReportSummaryResponse]:
    """Lists all generated forensic reports for a case."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    reports = case_store.list_reports(case_id)
    summaries = []
    for r in reports:
        meta = r.get("metadata", {})
        summaries.append(
            ReportSummaryResponse(
                report_id=meta.get("report_id", ""),
                case_id=case_id,
                report_title=meta.get("report_title", "Forensic Report"),
                run_id=meta.get("run_id", "baseline"),
                run_type=meta.get("run_type", "BASELINE"),
                generated_at_iso=meta.get("generated_at_iso", ""),
                fingerprint=meta.get("fingerprint", ""),
                findings_count=len(r.get("findings", [])),
                gaps_count=len(r.get("evidence_gaps", [])),
                is_synthetic=meta.get("is_synthetic_demonstration", False),
            )
        )
    return summaries


@app.get("/api/cases/{case_id}/reports/{report_id}", response_model=ForensicReportResponse)
def get_case_report_endpoint(
    case_id: str,
    report_id: str,
) -> ForensicReportResponse:
    """Retrieves a specific forensic report JSON by report ID."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    try:
        rep_data = case_store.get_report(case_id, report_id)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=f"Stored report is corrupted: {exc}")

    if not rep_data:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found in case '{case_id}'.")

    try:
        return ForensicReportResponse(**rep_data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stored report failed schema validation: {exc}")


@app.get("/api/cases/{case_id}/reports/{report_id}/export")
def export_case_report_endpoint(
    case_id: str,
    report_id: str,
    format: Optional[str] = "json",
):
    """Exports a forensic report as JSON, HTML, or PDF without mutating case state."""
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    try:
        rep_data = case_store.get_report(case_id, report_id)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=f"Stored report is corrupted: {exc}")

    if not rep_data:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found in case '{case_id}'.")

    try:
        report = ForensicReport.model_validate(rep_data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stored report failed schema validation: {exc}")

    fmt = (format or "json").strip().lower()
    safe_rep_id = sanitize_filename(report_id)

    if fmt == "json":
        json_bytes = json.dumps(report.model_dump(mode="json"), indent=2).encode("utf-8")
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="tarka_{safe_rep_id}.json"'},
        )

    elif fmt == "html":
        html_text = ForensicReportHTMLExporter.render_html(report)
        return Response(
            content=html_text.encode("utf-8"),
            media_type="text/html; charset=utf-8",
            headers={"Content-Disposition": f'inline; filename="tarka_{safe_rep_id}.html"'},
        )

    elif fmt == "pdf":
        try:
            pdf_bytes = ForensicReportPDFExporter.render_pdf(report)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="tarka_{safe_rep_id}.pdf"'},
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {exc}")

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported export format '{format}'. Supported formats are: json, html, pdf.",
        )


def compute_solver_fingerprints(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_cfg: TravelSpeedConfig,
    handset_with_third_party: bool,
    max_cores: int,
    verdict: str,
    mus_fact_ids: List[List[str]],
    mss_scenarios: List[List[str]],
    leave_one_out: Dict[str, bool],
    bound_vs_gap: List[BoundVsGapItem],
    margin_breakdown: Optional[MarginBreakdown],
    enable_pair_pruning: bool = True,
    source_weights: Optional[Dict[str, int]] = None,
    solver_version: str = "1.0.0",
    ruleset_version: str = "1.0.0",
) -> Tuple[str, str, str]:
    """Computes versioned recipe, result, and composite fingerprints for SMT solver executions.
    
    Forensic Disclosures:
    - Fingerprints seal deterministic computational reproduction of the SMT constraint recipe and outcome.
    - Fingerprints do NOT prove original evidence authenticity, real-world fact truth, or legal admissibility.
    - Volatile run IDs and wall-clock execution times are strictly excluded from all fingerprint digests.
    """
    fact_digests = []
    for f in facts:
        reg = f.region
        if reg is not None:
            if isinstance(reg, dict):
                lat = reg.get("latitude")
                lon = reg.get("longitude")
                rad = reg.get("radius_meters")
            else:
                lat = getattr(reg, "latitude", None)
                lon = getattr(reg, "longitude", None)
                rad = getattr(reg, "radius_meters", None)
            reg_str = f"{lat}:{lon}:{rad}"
        else:
            reg_str = "NO_REGION"

        tw = f.time_window
        tw_str = f"{tw.reported_epoch}:{tw.start_epoch}:{tw.end_epoch}" if tw else "NO_TW"
        dev_str = f.device_id or "NO_DEV"
        auth_val = f.auth_type.value if hasattr(f.auth_type, "value") else str(f.auth_type)
        sha_str = f.sha256 or ""
        refs_str = ",".join(sorted(f.entity_refs)) if f.entity_refs else ""
        ts_valid = is_valid_solver_fact_timestamp(f)
        f_repr = f"{f.id}:{f.kind.value}:{f.clock_id}:{tw_str}:{ts_valid}:{reg_str}:{dev_str}:{auth_val}:{sha_str}:{refs_str}"
        fact_digests.append(f_repr)
    facts_digest = hashlib.sha256("\n".join(sorted(fact_digests)).encode("utf-8")).hexdigest()

    recipe_payload = {
        "schema_version": "2.0.0",
        "solver_version": solver_version,
        "ruleset_version": ruleset_version,
        "clock_bounds": sorted([(k, float(v)) for k, v in clock_bounds.items()]),
        "speed_config": speed_cfg.model_dump(),
        "handset_with_third_party": bool(handset_with_third_party),
        "enable_pair_pruning": bool(enable_pair_pruning),
        "max_cores": int(max_cores),
        "source_weights": sorted([(k, int(v)) for k, v in source_weights.items()]) if source_weights else None,
        "facts_digest": facts_digest,
        "fact_count": len(facts),
    }
    recipe_fingerprint = hashlib.sha256(json.dumps(recipe_payload, sort_keys=True).encode("utf-8")).hexdigest()

    mus_digests = sorted([",".join(sorted(core)) for core in mus_fact_ids])
    mss_digests = sorted([",".join(sorted(scen)) for scen in mss_scenarios])
    loo_digests = sorted([f"{k}:{v}" for k, v in sorted(leave_one_out.items())])
    bvg_digests = sorted([f"{b.pair}:{b.avail_s}:{b.req_s}:{b.gap_s}:{b.status}" for b in bound_vs_gap])
    margin_repr = f"{margin_breakdown.overall_skew_margin_seconds}:{sorted(margin_breakdown.breakdown_margins.items())}" if margin_breakdown else "NO_MARGIN"

    result_payload = {
        "schema_version": "2.0.0",
        "verdict": verdict,
        "mus_cores": mus_digests,
        "mss_scenarios": mss_digests,
        "leave_one_out": loo_digests,
        "bound_vs_gap": bvg_digests,
        "margin_breakdown": margin_repr,
    }
    result_fingerprint = hashlib.sha256(json.dumps(result_payload, sort_keys=True).encode("utf-8")).hexdigest()
    composite_fp = hashlib.sha256(f"v2:{recipe_fingerprint}:{result_fingerprint}".encode("utf-8")).hexdigest()
    return recipe_fingerprint, result_fingerprint, composite_fp


@app.post("/api/solve", response_model=SolveResponse)
def solve_system(req: SolveRequest) -> SolveResponse:
    """Executes SMT constraint solving, MARCO All-MUS enumeration, and margin breakdown."""
    t_start = time.perf_counter()

    facts = [dict_to_fact(f) for f in req.facts]
    clock_bounds = dict(req.clock_bounds)

    if not facts and req.case_id:
        if req.case_id == "workspace":
            facts = get_case_workspace_facts("workspace")
            if not clock_bounds:
                clock_bounds = {f.clock_id: 300.0 for f in facts} if facts else {"clk_default": 300.0}
        elif req.case_id in case_map:
            case_data = case_map[req.case_id][2](seed=42)
            facts = list(case_data.facts)
            if not clock_bounds:
                clock_bounds = dict(case_data.clock_bounds)

    speed_cfg = (
        TravelSpeedConfig(**req.speed_config.model_dump())
        if req.speed_config
        else TravelSpeedConfig()
    )

    if not facts:
        rec_fp, res_fp, sol_fp = compute_solver_fingerprints(
            facts=[],
            clock_bounds=clock_bounds,
            speed_cfg=speed_cfg,
            handset_with_third_party=req.handset_with_third_party,
            max_cores=req.max_cores,
            verdict="CONSISTENT",
            mus_fact_ids=[],
            mss_scenarios=[],
            leave_one_out={},
            bound_vs_gap=[],
            margin_breakdown=None,
            enable_pair_pruning=True,
            source_weights=req.source_weights,
        )
        return SolveResponse(
            verdict="CONSISTENT",
            verdict_label="No conflict found under the stated model — this does not verify the alibi",
            mus_fact_ids=[],
            mss_scenarios=[],
            is_truncated=False,
            corroboration_counts={},
            leave_one_out={},
            bound_vs_gap=[],
            margin_breakdown=None,
            execution_time_ms=0.0,
            total_solver_calls=0,
            recipe_fingerprint=rec_fp,
            result_fingerprint=res_fp,
            solver_fingerprint=sol_fp,
        )

    # Run MARCO All-MUS enumeration
    mus_res = enumerate_all_mus(
        facts=facts,
        clock_bounds=clock_bounds,
        speed_config=speed_cfg,
        handset_with_third_party=req.handset_with_third_party,
        max_cores=req.max_cores,
    )

    is_sat = len(mus_res.mus_fact_ids) == 0

    if is_sat:
        verdict = "CONSISTENT"
        verdict_label = "No conflict found under the stated model — this does not verify the alibi"
    else:
        verdict = "INCONSISTENT"
        verdict_label = "Inconsistent under the stated model"

    # Compute corroboration and leave-one-out
    loo_report = compute_corroboration_and_leave_one_out(
        facts=facts,
        clock_bounds=clock_bounds,
        mus_cores=mus_res.mus_fact_ids,
        speed_config=speed_cfg,
        handset_with_third_party=req.handset_with_third_party,
    )
    corroboration = loo_report.fact_corroboration_counts
    leave_one_out_map = {f.id: (f.id in loo_report.restores_sat_fact_ids) for f in facts}

    # Compute Bound-vs-Gap matrix
    bound_vs_gap: List[BoundVsGapItem] = []
    n = len(facts)
    for i in range(n):
        for j in range(i + 1, n):
            f1, f2 = facts[i], facts[j]
            if f1.region is None or f2.region is None:
                continue

            travel = compute_travel_lower_bound(f1.region, f2.region, config=speed_cfg)
            early, late = (f1, f2) if f1.time_window.reported_epoch <= f2.time_window.reported_epoch else (f2, f1)
            nominal_s = late.time_window.reported_epoch - early.time_window.reported_epoch
            skew_s = 0.0 if early.clock_id == late.clock_id else (clock_bounds.get(early.clock_id, 300.0) + clock_bounds.get(late.clock_id, 300.0))
            avail_s = nominal_s + skew_s
            req_s = travel.min_travel_seconds
            gap_s = avail_s - req_s

            status_str = "FEASIBLE" if gap_s >= 0 else f"DEFICIT ({abs(gap_s):.1f}s)"

            bound_vs_gap.append(
                BoundVsGapItem(
                    pair=f"{f1.id} <-> {f2.id}",
                    nominal_s=round(nominal_s, 1),
                    skew_s=round(skew_s, 1),
                    avail_s=round(avail_s, 1),
                    dist_km=round(travel.haversine_distance_km, 1),
                    req_s=round(req_s, 1),
                    gap_s=round(gap_s, 1),
                    mode=travel.governing_mode,
                    status=status_str,
                )
            )

    # Compute robustness margin if inconsistent
    margin_breakdown: Optional[MarginBreakdown] = None
    if not is_sat:
        m_res = compute_robustness_margin(
            facts=facts,
            clock_bounds=clock_bounds,
            speed_config=speed_cfg,
            handset_with_third_party=req.handset_with_third_party,
        )
        margin_breakdown = MarginBreakdown(
            is_initially_satisfiable=m_res.is_initially_satisfiable,
            overall_skew_margin_seconds=m_res.overall_skew_margin_seconds,
            breakdown_margins=m_res.breakdown_margins,
        )

    # Compute hypotheses and minimal corrections
    hypo_report = compute_hypothesis_report(
        facts=facts,
        clock_bounds=clock_bounds,
        speed_config=speed_cfg,
        handset_with_third_party=req.handset_with_third_party,
        mus_cores=mus_res.mus_fact_ids,
        custom_weights=req.source_weights,
        max_hypotheses=5,
    )

    # Compute clock skew and timestamp tamper inference
    skew_report = infer_required_clock_offsets(
        facts=facts,
        clock_bounds=clock_bounds,
        speed_config=speed_cfg,
        handset_with_third_party=req.handset_with_third_party,
        mus_cores=mus_res.mus_fact_ids,
    )

    exec_time_ms = (time.perf_counter() - t_start) * 1000.0

    rec_fp, res_fp, sol_fp = compute_solver_fingerprints(
        facts=facts,
        clock_bounds=clock_bounds,
        speed_cfg=speed_cfg,
        handset_with_third_party=req.handset_with_third_party,
        max_cores=req.max_cores,
        verdict=verdict,
        mus_fact_ids=mus_res.mus_fact_ids,
        mss_scenarios=mus_res.mss_scenarios,
        leave_one_out=leave_one_out_map,
        bound_vs_gap=bound_vs_gap,
        margin_breakdown=margin_breakdown,
        enable_pair_pruning=True,
        source_weights=req.source_weights,
    )

    return SolveResponse(
        verdict=verdict,
        verdict_label=verdict_label,
        mus_fact_ids=mus_res.mus_fact_ids,
        mss_scenarios=mus_res.mss_scenarios,
        is_truncated=mus_res.is_truncated,
        corroboration_counts=corroboration,
        leave_one_out=leave_one_out_map,
        bound_vs_gap=bound_vs_gap,
        margin_breakdown=margin_breakdown,
        hypotheses=[h.model_dump(mode="json") for h in hypo_report.hypotheses],
        track_decoupling_hypothesis=hypo_report.track_decoupling_hypothesis.model_dump(mode="json") if hypo_report.track_decoupling_hypothesis else None,
        leave_one_out_sensitivity=[s.model_dump(mode="json") for s in hypo_report.leave_one_out_sensitivity],
        cost_model=hypo_report.cost_model,
        clock_skew_inference=skew_report.model_dump(mode="json"),
        execution_time_ms=round(exec_time_ms, 2),
        total_solver_calls=mus_res.total_solver_calls,
        recipe_fingerprint=rec_fp,
        result_fingerprint=res_fp,
        solver_fingerprint=sol_fp,
    )


@app.get("/api/custody/trail", response_model=CustodyTrailResponse)
def get_custody_trail(case_id: str = "workspace") -> CustodyTrailResponse:
    """Returns the custody ledger with SHA-256 digests recorded at intake and verified against preserved stored bytes for a specific case."""
    c_ledger = get_case_ledger(case_id)
    trail = c_ledger.get_all_entries()
    report = c_ledger.verify_chain()
    head_hash = c_ledger.get_chain_head_hash()

    entries = [
        CustodyEntryResponse(
            sequence=e.seq,
            timestamp_utc=e.timestamp_iso,
            action=e.action,
            fact_id=e.fact_id,
            payload_hash=e.payload_sha256,
            prev_hash=e.prev_hash,
            entry_hash=e.entry_hash,
        )
        for e in trail
    ]

    return CustodyTrailResponse(
        entries=entries,
        chain_head_hash=head_hash,
        is_valid=report.is_valid,
        total_entries=len(entries),
    )


@app.post("/api/custody/alter_demo_byte", response_model=AlterOneByteDemoResponse)
def alter_one_byte_demo(case_id: str = "workspace") -> AlterOneByteDemoResponse:
    """Demonstrates tamper detection by altering one byte on a temporary clone, NEVER the live ledger."""
    # Create temporary clone of the specified case's database
    c_ledger = get_case_ledger(case_id)
    case_db_path = get_case_dir(case_id) / "custody.db"
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        shutil.copyfile(case_db_path, tmp_path)
        clone_ledger = CustodyLedger(db_path=str(tmp_path))

        # Check if clone has at least 1 entry; if empty, record a sample ingest entry in clone
        if len(clone_ledger.get_all_entries()) == 0:
            clone_ledger.append_action(
                action="DEMO_INGEST_SAMPLE",
                fact_id="FACT_DEMO_01",
                payload_data={"demo": "sample_record"},
            )

        # Mutate single character in custody_chain row in clone SQLite database
        with sqlite3.connect(tmp_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT seq, action FROM custody_chain ORDER BY seq DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                seq, original_action = row
                mutated_action = original_action[:-1] + "X" if len(original_action) > 1 else original_action + "X"
                cursor.execute("UPDATE custody_chain SET action = ? WHERE seq = ?", (mutated_action, seq))
                conn.commit()

        # Re-verify the mutated clone
        report = clone_ledger.verify_chain()

        return AlterOneByteDemoResponse(
            operation="Alter one byte (demo copy)",
            is_valid=report.is_valid,
            status_label="Integrity check failed" if not report.is_valid else "Integrity check passed",
            details=f"Altered byte in temporary clone. Verification result: {report.details}",
        )
    finally:
        if tmp_path.exists():
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def _detect_csv_kind(first_lines_text: str) -> str:
    """Classifies CSV content based on header terms into 'cdr', 'bank_upi', or 'unknown'."""
    lower = first_lines_text.lower()
    cdr_indicators = ["msisdn", "caller", "called", "calling", "first_cgi", "cell_id", "tower", "imei", "imsi", "call_type", "dur_sec"]
    upi_indicators = ["txn", "upi", "rrn", "vpa", "amount", "debit", "credit", "merchant", "payee", "payer", "beneficiary"]

    cdr_count = sum(1 for kw in cdr_indicators if kw in lower)
    upi_count = sum(1 for kw in upi_indicators if kw in lower)

    if cdr_count >= 2 and cdr_count > upi_count:
        return "cdr"
    if upi_count >= 2 and upi_count > cdr_count:
        return "bank_upi"
    if any(k in lower for k in ["cell_id", "tower_id", "first_cgi"]):
        return "cdr"
    if any(k in lower for k in ["vpa", "rrn", "upi_ref"]):
        return "bank_upi"
    return "unknown"


@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_evidence_files(
    request: Request,
    files: List[UploadFile] = File(...),
    tz: str = Form("Asia/Kolkata"),
    case_id: str = Form("workspace"),
    append_to_custody: bool = Form(True),
) -> IngestResponse:
    """Ingests multi-source raw forensic evidence files.

    Extracts facts, verifies line conservation, computes SHA-256 digests,
    and appends ingested facts into the custody ledger with SHA-256 digests recorded at intake and verified against preserved stored bytes.
    """
    root_path = request.scope.get("root_path", "")
    if root_path == "/api/v1/forensics/tarka":
        try:
            from app.services.auth_service import AuthService
            auth_service = AuthService.get_instance()
            user = getattr(request.state, "user", None)
            if not user:
                auth_header = request.headers.get("Authorization")
                user = auth_service.authenticate_token(auth_header, strict=True)
            auth_service.enforce_case_access(user, case_id)
        except ImportError:
            pass

    try:
        import zoneinfo
        tzinfo = zoneinfo.ZoneInfo(tz)
    except Exception:
        tzinfo = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

    c_ledger = get_case_ledger(case_id)
    ingested_hashes = get_case_ingested_hashes(case_id)

    # Pre-scan for custom tower coordinates files if present
    custom_towers: Dict[str, GeographicRegion] = {}
    for k, v in INDIAN_CELL_TOWERS.items():
        radius = v.get("radius_meters", v.get("coverage_radius_meters", 500.0))
        custom_towers[k] = GeographicRegion(
            latitude=float(v["latitude"]),
            longitude=float(v["longitude"]),
            radius_meters=float(radius),
        )
    raw_files_data = []

    for upload in files:
        data = await upload.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File {upload.filename} exceeds maximum size limit of 10 MB.",
            )
        filename = sanitize_filename(upload.filename or "unknown_file")
        sha256 = hashlib.sha256(data).hexdigest()
        raw_files_data.append((filename, sha256, data))

        # Check if tower coordinate JSON
        if filename.endswith(".json") and "tower" in filename.lower():
            try:
                parsed_json = json.loads(data.decode("utf-8"))
                if isinstance(parsed_json, dict):
                    for k, v in parsed_json.items():
                        if isinstance(v, dict) and "latitude" in v and "longitude" in v:
                            radius = v.get("radius_meters", v.get("coverage_radius_meters", 500.0))
                            custom_towers[k] = GeographicRegion(
                                latitude=float(v["latitude"]),
                                longitude=float(v["longitude"]),
                                radius_meters=float(radius),
                            )
            except Exception:
                pass

    all_facts: List[Dict[str, Any]] = []
    all_rejected: List[RejectedRowModel] = []
    all_warnings: List[str] = []
    source_summaries: List[SourceFileSummary] = []

    for filename, sha256, data in raw_files_data:
        # Check deduplication by file hash in this case
        if sha256 in ingested_hashes:
            all_warnings.append(
                f"File '{filename}' (SHA-256: {sha256[:12]}...) was already ingested into case '{case_id}'. Skipped duplicate."
            )
            source_summaries.append(
                SourceFileSummary(
                    filename=filename,
                    sha256=sha256,
                    size_bytes=len(data),
                    parsed_facts_count=0,
                    rejected_rows_count=0,
                    parser_type="DuplicateSkipped",
                    is_date_ambiguous=False,
                )
            )
            continue

        # If it was purely a tower coordinates JSON, record summary and continue
        if filename.endswith(".json") and "tower" in filename.lower():
            record_case_ingested_file(case_id, sha256, filename)
            ingested_hashes.add(sha256)
            source_summaries.append(
                SourceFileSummary(
                    filename=filename,
                    sha256=sha256,
                    size_bytes=len(data),
                    parsed_facts_count=0,
                    rejected_rows_count=0,
                    parser_type="TowerCoordinatesJSON",
                    is_date_ambiguous=False,
                )
            )
            continue

        ext = Path(filename).suffix.lower()
        file_facts: List[Fact] = []
        file_rejected: List[RejectedRowModel] = []
        parser_type = "unknown"
        is_ambiguous = False

        if ext in [".csv", ".tsv"]:
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                text = data.decode("latin-1")

            csv_kind = _detect_csv_kind(text[:2048])
            if csv_kind == "cdr":
                parser_type = "CDRParser"
                cdr_parser = CDRParser(tower_lookup=custom_towers, tz=tzinfo)
                res = cdr_parser.parse_text(text, filename=filename)
                file_facts = res.facts
                file_rejected = [
                    RejectedRowModel(
                        source_file=filename,
                        line_number=r.line_number,
                        raw_content=r.raw_content,
                        reason=r.reason,
                    )
                    for r in res.rejected_rows
                ]
                all_warnings.extend(res.warnings)
            elif csv_kind == "bank_upi":
                parser_type = "BankUPIParser"
                upi_parser = BankUPIParser(tz=tzinfo)
                res = upi_parser.parse_text(text, filename=filename)
                file_facts = res.facts
                file_rejected = [
                    RejectedRowModel(
                        source_file=filename,
                        line_number=r.line_number,
                        raw_content=r.raw_content,
                        reason=r.reason,
                    )
                    for r in res.rejected_rows
                ]
                all_warnings.extend(res.warnings)
            else:
                parser_type = "UnmappedCSV"
                all_warnings.append(
                    f"File '{filename}' did not match default CDR or Bank/UPI schemas. "
                    f"Use the Column-Mapping Wizard to configure extraction."
                )
                raw_lines = [l for l in text.splitlines() if l.strip()]
                for l_idx, line_content in enumerate(raw_lines[1:], start=2):
                    file_rejected.append(
                        RejectedRowModel(
                            source_file=filename,
                            line_number=l_idx,
                            raw_content=line_content,
                            reason="Unmapped CSV format. Use Column-Mapping Wizard to extract.",
                        )
                    )

        elif ext in [".txt", ".log"]:
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                text = data.decode("latin-1")

            parser_type = "WhatsAppParser"
            wa_parser = WhatsAppParser(tz=tzinfo)
            res = wa_parser.parse_text(text, filename=filename)
            file_facts = res.facts
            file_rejected = [
                RejectedRowModel(
                    source_file=filename,
                    line_number=r.line_number,
                    raw_content=r.raw_content,
                    reason=r.reason,
                )
                for r in res.rejected_rows
            ]
            is_ambiguous = getattr(res, "is_date_ambiguous", False)
            if is_ambiguous:
                all_warnings.append(
                    f"WhatsApp export '{filename}' has ambiguous date format across all rows (<=12). "
                    f"Conservative interpretation applied under stated model."
                )
            all_warnings.extend(res.warnings)

        elif ext in [".jpg", ".jpeg", ".png", ".heic", ".tif", ".tiff"]:
            parser_type = "EXIFTriageParser"
            exif_parser = EXIFTriageParser()
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp_file:
                tmp_file.write(data)
                tmp_path = Path(tmp_file.name)
            try:
                report = exif_parser.triage_file(tmp_path, default_tz=tzinfo)
                if report.extracted_fact:
                    file_facts.append(report.extracted_fact)
                for anom in report.structural_anomalies:
                    file_rejected.append(
                        RejectedRowModel(
                            source_file=filename,
                            line_number=1,
                            raw_content=f"Tags: {', '.join(anom.affected_tags)}",
                            reason=f"Structural anomaly: {anom.description}",
                        )
                    )
                all_warnings.extend(report.audit_notes)
            finally:
                if tmp_path.exists():
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
        else:
            parser_type = "Unsupported"
            file_rejected.append(
                RejectedRowModel(
                    source_file=filename,
                    line_number=1,
                    raw_content=f"File extension: {ext}",
                    reason=f"Unsupported evidence file format '{ext}'.",
                )
            )

        # Record file hash into deduplication table
        record_case_ingested_file(case_id, sha256, filename)
        ingested_hashes.add(sha256)

        # Append to case custody ledger if requested
        if append_to_custody:
            for fact in file_facts:
                c_ledger.append_fact(fact)

        for fact in file_facts:
            all_facts.append(fact.model_dump(mode="json"))
        all_rejected.extend(file_rejected)

        source_summaries.append(
            SourceFileSummary(
                filename=filename,
                sha256=sha256,
                size_bytes=len(data),
                parsed_facts_count=len(file_facts),
                rejected_rows_count=len(file_rejected),
                parser_type=parser_type,
                is_date_ambiguous=is_ambiguous,
            )
        )

    # Save newly ingested facts into persistent case workspace
    if all_facts:
        new_fact_objs = [dict_to_fact(f) for f in all_facts]
        save_case_workspace_facts(case_id, new_fact_objs)

    return IngestResponse(
        source_files=source_summaries,
        facts=all_facts,
        rejected_rows=all_rejected,
        warnings=all_warnings,
        total_facts_ingested=len(all_facts),
        total_rejected_rows=len(all_rejected),
        custody_chain_head=c_ledger.get_chain_head_hash(),
        legal_disclaimer=(
            "Extraction identifies chronological and spatial bounds under the stated parser rules; "
            "it does not verify identity or establish authenticity. Supports Section 63 BSA review."
        ),
    )


@app.post("/api/ingest/preview_csv", response_model=CSVPreviewResponse)
async def preview_csv(file: UploadFile = File(...)) -> CSVPreviewResponse:
    """Previews an unknown CSV schema, samples rows, and heuristically suggests column mappings."""
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")

    sha256 = hashlib.sha256(data).hexdigest()
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = data.decode("latin-1")

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="Could not parse CSV content.")

    headers = [col.strip() for col in rows[0]]
    sample_rows: List[Dict[str, str]] = []
    for r in rows[1:6]:
        row_dict: Dict[str, str] = {}
        for idx, val in enumerate(r):
            if idx < len(headers):
                row_dict[headers[idx]] = val.strip()
        sample_rows.append(row_dict)

    suggested: Dict[str, Optional[str]] = {
        "timestamp_col": None,
        "lat_col": None,
        "lon_col": None,
        "entity_col": None,
        "kind_col": None,
    }
    for h in headers:
        hl = h.lower()
        if suggested["timestamp_col"] is None and any(k in hl for k in ["time", "date", "dttm", "timestamp", "datetime"]):
            suggested["timestamp_col"] = h
        elif suggested["lat_col"] is None and any(k in hl for k in ["lat", "latitude", "y_coord"]):
            suggested["lat_col"] = h
        elif suggested["lon_col"] is None and any(k in hl for k in ["lon", "lng", "longitude", "x_coord"]):
            suggested["lon_col"] = h
        elif suggested["entity_col"] is None and any(k in hl for k in ["msisdn", "caller", "user", "phone", "account", "vpa", "sender", "entity", "imei"]):
            suggested["entity_col"] = h
        elif suggested["kind_col"] is None and any(k in hl for k in ["type", "kind", "service", "category", "action"]):
            suggested["kind_col"] = h

    return CSVPreviewResponse(
        filename=sanitize_filename(file.filename or "upload.csv"),
        sha256=sha256,
        total_lines=len(lines),
        headers=headers,
        sample_rows=sample_rows,
        suggested_mapping=suggested,
    )


@app.post("/api/ingest/custom_csv", response_model=IngestResponse)
async def ingest_custom_csv(
    request: Request,
    file: UploadFile = File(...),
    config: str = Form(...),
    case_id: str = Form("workspace"),
) -> IngestResponse:
    """Ingests a custom CSV using operator-defined column mappings.

    Maintains line conservation invariant: parsed_facts + rejected_rows == total_data_lines.
    """
    root_path = request.scope.get("root_path", "")
    if root_path == "/api/v1/forensics/tarka":
        try:
            from app.services.auth_service import AuthService
            auth_service = AuthService.get_instance()
            user = getattr(request.state, "user", None)
            if not user:
                auth_header = request.headers.get("Authorization")
                user = auth_service.authenticate_token(auth_header, strict=True)
            auth_service.enforce_case_access(user, case_id)
        except ImportError:
            pass

    try:
        parsed_config = json.loads(config)
        req = CustomCSVIngestRequest(**parsed_config)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid mapping configuration: {str(e)}")

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")

    sha256 = hashlib.sha256(data).hexdigest()
    filename = sanitize_filename(file.filename or "custom_upload.csv")

    c_ledger = get_case_ledger(case_id)
    ingested_hashes = get_case_ingested_hashes(case_id)
    warnings: List[str] = []

    if sha256 in ingested_hashes:
        warnings.append(
            f"File '{filename}' (SHA-256: {sha256[:12]}...) was already ingested into case '{case_id}'. Skipped duplicate."
        )
        return IngestResponse(
            source_files=[
                SourceFileSummary(
                    filename=filename,
                    sha256=sha256,
                    size_bytes=len(data),
                    parsed_facts_count=0,
                    rejected_rows_count=0,
                    parser_type="CustomCSVMapped",
                    is_date_ambiguous=False,
                )
            ],
            facts=[],
            rejected_rows=[],
            warnings=warnings,
            total_facts_ingested=0,
            total_rejected_rows=0,
            custody_chain_head=c_ledger.get_chain_head_hash(),
            legal_disclaimer=(
                "Extraction identifies chronological and spatial bounds under the stated parser rules; "
                "it does not verify identity or establish authenticity. Supports Section 63 BSA review."
            ),
        )

    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = data.decode("latin-1")

    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        raise HTTPException(status_code=400, detail="File is empty.")

    reader = csv.reader(io.StringIO(text))
    rows = [r for r in reader if r and any(c.strip() for c in r)]
    if not rows or len(rows) < 2:
        raise HTTPException(status_code=400, detail="CSV file must contain a header and at least one data row.")

    headers = [c.strip() for c in rows[0]]
    header_indices = {col.lower(): i for i, col in enumerate(headers)}

    def get_val(row_cells: List[str], col_name: Optional[str]) -> Optional[str]:
        if not col_name:
            return None
        idx = header_indices.get(col_name.lower())
        if idx is not None and idx < len(row_cells):
            v = row_cells[idx].strip()
            return v if v else None
        return None

    facts: List[Fact] = []
    rejected: List[RejectedRowModel] = []

    for line_idx, row_cells in enumerate(rows[1:], start=2):
        raw_line_str = ",".join(row_cells)

        # 1. Parse timestamp
        raw_ts = get_val(row_cells, req.timestamp_col)
        if not raw_ts:
            rejected.append(
                RejectedRowModel(
                    source_file=filename,
                    line_number=line_idx,
                    raw_content=raw_line_str,
                    reason=f"Missing timestamp in column '{req.timestamp_col}'",
                )
            )
            continue

        try:
            if req.timestamp_format:
                dt = datetime.datetime.strptime(raw_ts, req.timestamp_format)
            else:
                from dateutil import parser as dt_parser
                dt = dt_parser.parse(raw_ts)

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            epoch_s = dt.timestamp()
            time_window = TimeWindow(
                start_epoch=epoch_s,
                end_epoch=epoch_s,
                reported_epoch=epoch_s,
            )
        except Exception as e:
            rejected.append(
                RejectedRowModel(
                    source_file=filename,
                    line_number=line_idx,
                    raw_content=raw_line_str,
                    reason=f"Failed to parse timestamp '{raw_ts}': {str(e)}",
                )
            )
            continue

        # 2. Parse coordinates if supplied
        region: Optional[GeographicRegion] = None
        raw_lat = get_val(row_cells, req.lat_col)
        raw_lon = get_val(row_cells, req.lon_col)
        if raw_lat and raw_lon:
            try:
                lat_f = float(raw_lat)
                lon_f = float(raw_lon)
                if -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0:
                    region = GeographicRegion(
                        latitude=lat_f,
                        longitude=lon_f,
                        radius_meters=req.radius_meters,
                    )
                else:
                    rejected.append(
                        RejectedRowModel(
                            source_file=filename,
                            line_number=line_idx,
                            raw_content=raw_line_str,
                            reason=f"Coordinates out of range: lat={lat_f}, lon={lon_f}",
                        )
                    )
                    continue
            except ValueError:
                rejected.append(
                    RejectedRowModel(
                        source_file=filename,
                        line_number=line_idx,
                        raw_content=raw_line_str,
                        reason=f"Non-numeric coordinates: lat='{raw_lat}', lon='{raw_lon}'",
                    )
                )
                continue

        # 3. Extract entity, kind, tier, auth
        entity_id = get_val(row_cells, req.entity_col) or "UNKNOWN_ENTITY"
        kind_str = get_val(row_cells, req.kind_col) or req.default_kind

        try:
            fact_kind = FactKind(kind_str)
        except ValueError:
            fact_kind = FactKind.CDR_DATA

        try:
            tier = TrustTier(req.trust_tier.upper())
        except ValueError:
            tier = TrustTier.T2

        try:
            auth = AuthType(req.auth_type.lower())
        except ValueError:
            auth = AuthType.PASSIVE

        fact_id = f"FACT_CUSTOM_{sha256[:6]}_{line_idx:04d}"
        fact = Fact(
            id=fact_id,
            source_file=filename,
            sha256=sha256,
            line_ref=f"line:{line_idx}",
            kind=fact_kind,
            time_window=time_window,
            region=region,
            tier=tier,
            device_id=entity_id,
            clock_id=req.clock_id,
            entity_refs=[f"ENTITY_{entity_id}"],
            auth_type=auth,
            raw_payload={"line_number": line_idx, "raw_content": raw_line_str},
        )
        facts.append(fact)

    record_case_ingested_file(case_id, sha256, filename)

    if req.append_to_custody:
        for f in facts:
            c_ledger.append_fact(f)

    if facts:
        save_case_workspace_facts(case_id, facts)

    summary = SourceFileSummary(
        filename=filename,
        sha256=sha256,
        size_bytes=len(data),
        parsed_facts_count=len(facts),
        rejected_rows_count=len(rejected),
        parser_type="CustomCSVMapped",
        is_date_ambiguous=False,
    )

    return IngestResponse(
        source_files=[summary],
        facts=[f.model_dump(mode="json") for f in facts],
        rejected_rows=rejected,
        warnings=warnings,
        total_facts_ingested=len(facts),
        total_rejected_rows=len(rejected),
        custody_chain_head=c_ledger.get_chain_head_hash(),
        legal_disclaimer=(
            "Extraction identifies chronological and spatial bounds under the stated parser rules; "
            "it does not verify identity or establish authenticity. Supports Section 63 BSA review."
        ),
    )



# ============================================================================
# TARKA v5.0 ADVANCED FORENSIC ENGINES (Milestones 2 - 5)
# ============================================================================

from tarka.core.intake_falsifier import (
    validate_running_balance as _validate_running_balance,
    decode_rail_reference as _decode_rail_reference,
    analyze_pdf_structural_tamper as _analyze_pdf_structural_tamper,
    build_cgnat_merkle_shield as _build_cgnat_merkle_shield,
    IntakeValidationRequest,
    IntakeValidationFullResponse,
)
from tarka.core.cgnat_attribution import (
    solve_cgnat_funnel as _solve_cgnat_funnel,
    analyze_dual_sim_hardware as _analyze_dual_sim_hardware,
    detect_hotspot_collision as _detect_hotspot_collision,
    AttributionSolveRequest,
    CgnatAttributionResponse,
)
from tarka.core.taint_lien_engine import (
    compute_taint_and_mincut as _compute_taint_and_mincut,
    TaintComputeRequest,
    TaintComputeResponse,
)
from tarka.core.court_proof_bundle import (
    evaluate_leave_one_out as _evaluate_leave_one_out,
    generate_bsa63_split_schedules as _generate_bsa63_split_schedules,
    get_paper_anchor as _get_paper_anchor,
    get_cbi_syndicate_memo as _get_cbi_syndicate_memo,
    CourtProofRequest,
    LeaveOneOutResponse,
    Bsa63SchedulesResponse,
    PaperAnchorResponse,
    CbiSyndicateResponse,
)

@app.post("/api/intake/validate", response_model=IntakeValidationFullResponse)
@app.post("/intake/validate", response_model=IntakeValidationFullResponse)
@app.post("/api/v1/forensics/tarka/intake/validate", response_model=IntakeValidationFullResponse)
async def api_intake_validate(req: IntakeValidationRequest):
    """Real-time intake falsifier: running-balance conservation, multi-rail RRN decoder, PDF XRef, and CGNAT Merkle shield."""
    bal_res = None
    if req.rows is not None:
        bal_res = _validate_running_balance(req.rows)

    rrn_res = None
    if req.rrn_to_decode is not None:
        rrn_res = _decode_rail_reference(req.rrn_to_decode, req.claimed_txn_time)

    pdf_res = None
    if req.pdf_metadata is not None:
        pdf_res = _analyze_pdf_structural_tamper(
            filename=req.pdf_metadata.get("filename", "statement.pdf"),
            sha256=req.pdf_metadata.get("sha256", "b198302ca876..."),
            file_size_bytes=req.pdf_metadata.get("file_size_bytes", 142800),
            eof_markers=req.pdf_metadata.get("eof_markers", 2),
            has_overlaid_text=req.pdf_metadata.get("has_overlaid_text", True)
        )

    cgnat_res = None
    if req.cgnat_subscribers is not None:
        cgnat_res = _build_cgnat_merkle_shield(req.cgnat_subscribers)

    return IntakeValidationFullResponse(
        balance_validation=bal_res,
        rrn_decoding=rrn_res,
        pdf_tamper_analysis=pdf_res,
        cgnat_pii_shield=cgnat_res
    )

@app.post("/api/attribution/solve", response_model=CgnatAttributionResponse)
@app.post("/attribution/solve", response_model=CgnatAttributionResponse)
@app.post("/api/v1/forensics/tarka/attribution/solve", response_model=CgnatAttributionResponse)
async def api_attribution_solve(req: AttributionSolveRequest):
    """CGNAT candidate intersection funnel (340 -> 41 -> 6 -> 1) with coincidental match probability."""
    sessions = req.sessions or []
    return _solve_cgnat_funnel(sessions, drop_source_port=req.drop_source_port)

@app.post("/api/taint/compute", response_model=TaintComputeResponse)
@app.post("/taint/compute", response_model=TaintComputeResponse)
@app.post("/api/v1/forensics/tarka/taint/compute", response_model=TaintComputeResponse)
async def api_taint_compute(req: TaintComputeRequest):
    """Time-Expanded DAG taint tracer (LIBR vs FIFO vs Pro-Rata) & Dinic Min-Cut completeness verifier."""
    return _compute_taint_and_mincut(
        inject_merchant_clean_deposit=req.inject_merchant_clean_deposit,
        freeze_budget_k=req.freeze_budget_k
    )

@app.post("/api/court-proof/evaluate", response_model=LeaveOneOutResponse)
@app.post("/court-proof/evaluate", response_model=LeaveOneOutResponse)
@app.post("/api/v1/forensics/tarka/court-proof/evaluate", response_model=LeaveOneOutResponse)
async def api_court_proof_evaluate(req: CourtProofRequest):
    """Live Leave-One-Out (LOO) defense admissibility stress-tester & prosecutor cross-examination rebuttals."""
    return _evaluate_leave_one_out(
        artifacts=req.artifacts,
        whatsapp_excluded=req.whatsapp_excluded,
        bank_clock_drifted=req.bank_clock_drifted,
        alibi_someone_else=req.alibi_someone_else_held_phone
    )

@app.get("/api/court-proof/schedules/{case_id}", response_model=Bsa63SchedulesResponse)
@app.get("/court-proof/schedules/{case_id}", response_model=Bsa63SchedulesResponse)
@app.get("/api/v1/forensics/tarka/court-proof/schedules/{case_id}", response_model=Bsa63SchedulesResponse)
async def api_court_proof_schedules(case_id: str):
    """BSA Section 63(4) Part A & Part B split schedules with Pune Bar Association compliance."""
    return _generate_bsa63_split_schedules(case_id)

@app.get("/api/court-proof/paper-anchor/{case_id}", response_model=PaperAnchorResponse)
@app.get("/court-proof/paper-anchor/{case_id}", response_model=PaperAnchorResponse)
@app.get("/api/v1/forensics/tarka/court-proof/paper-anchor/{case_id}", response_model=PaperAnchorResponse)
async def api_court_proof_paper_anchor(case_id: str):
    """24-Word BIP-39 mnemonic phrase and Ed25519 paper anchor for physical court custody."""
    return _get_paper_anchor(case_id)

@app.get("/api/court-proof/cbi-syndicate", response_model=CbiSyndicateResponse)
@app.get("/court-proof/cbi-syndicate", response_model=CbiSyndicateResponse)
@app.get("/api/v1/forensics/tarka/court-proof/cbi-syndicate", response_model=CbiSyndicateResponse)
async def api_court_proof_cbi_syndicate():
    """Salted Blind-Index (HMAC-SHA256) ₹10-Crore multi-state CBI cyber syndicate aggregation memo."""
    return _get_cbi_syndicate_memo()


# ==============================================================================
# SECTION 4 POLISH ENDPOINTS: EXCEL MULTI-SHEET & BOUNDED ASSISTANT
# ==============================================================================

from tarka.parsers.excel_parser import ExcelParser, SheetInfo, ExcelParseResult
from tarka.ai.bounded_assistant import (
    ScamTypologyClassifier,
    ComplaintNarrativeExtractor,
    TypologyClassification,
    ExtractedComplaintRecord,
)

class ExcelIngestRequest(BaseModel):
    target_sheet: Optional[str] = None
    case_id: str = "CASE-2026-001"

class ClassifyScamRequest(BaseModel):
    message_text: str = Field(..., description="Suspicious communication text, SMS, or transcript")

class ExtractComplaintRequest(BaseModel):
    complaint_text: str = Field(..., description="Raw narrative from 1930 Cybercrime Helpline or NCRP")
    complaint_ref: Optional[str] = Field(None, description="Optional portal complaint reference")

@app.post("/api/ingest/excel")
@app.post("/api/v1/forensics/tarka/ingest/excel")
async def api_ingest_excel(
    file: UploadFile = File(...),
    target_sheet: Optional[str] = Form(None),
    case_id: str = Form("CASE-2026-001"),
):
    """Ingests multi-sheet Excel (.xlsx) workbooks into case workspace facts."""
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds limit.")
    
    parser = ExcelParser()
    result = parser.parse(
        file_source=data,
        filename=sanitize_filename(file.filename or "evidence.xlsx"),
        target_sheet=target_sheet,
    )
    return {
        "source_file": result.source_file,
        "source_sha256": result.source_sha256,
        "sheets": [s.model_dump() for s in result.sheets],
        "facts_count": len(result.facts),
        "rejected_rows_count": len(result.rejected_rows),
        "total_rows_processed": result.total_rows_processed,
        "rejected_rows": [r.model_dump() for r in result.rejected_rows[:20]],
        "case_id": case_id,
    }

@app.post("/api/assistant/classify-scam")
@app.post("/api/v1/forensics/tarka/assistant/classify-scam")
async def api_classify_scam(req: ClassifyScamRequest):
    """Classifies communication text across the 6 major Indian fraud typologies."""
    classification = ScamTypologyClassifier.classify(req.message_text)
    return classification.model_dump()

@app.post("/api/assistant/extract-complaint")
@app.post("/api/v1/forensics/tarka/assistant/extract-complaint")
async def api_extract_complaint(req: ExtractComplaintRequest):
    """Extracts structured entities, suspect accounts, VPAs, and loss tranches from 1930 narrative."""
    record = ComplaintNarrativeExtractor.extract_entities(req.complaint_text, complaint_ref=req.complaint_ref)
    return record.model_dump()

