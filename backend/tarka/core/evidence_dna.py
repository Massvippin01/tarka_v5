"""TARKA Artifact and Evidence DNA Models & Case Storage.

Implements Phase 1 & Phase 2 of the TARKA architecture:
1. Original-artifact retention with SHA-256 digests recorded at intake and verified against preserved stored bytes.
2. Source, intake, and application-managed append-only custody ledger with integrity verification.
3. Separation of:
   - Verbatim Original Source Data (unaltered raw text/bytes)
   - Extracted Data (deterministic parser output with fine-grained ExtractedField records)
   - Inferred Data (clearly flagged with explicit rationale)
4. All fields reviewable with human audit status.
5. Explicit integrity/provenance limitation disclosures:
   Cryptographic SHA-256 hashing verifies bitstream preservation across transfer/storage;
   it does NOT establish external authenticity, real-world authorship, or absence of fabrication.
6. Connects WhatsApp, Bank/UPI, CDR, and EXIF/Claim parsers to Evidence DNA intake.
7. CanonicalFact bridging, explainable entity resolution, and deterministic correlation analysis.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import mimetypes
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator

from tarka.core.models import (
    Fact,
    FactKind,
    TrustTier,
    AuthType,
    TimeWindow,
    GeographicRegion,
)
from tarka.core.custody import CustodyLedger, GENESIS_PREV_HASH
from tarka.core.canonical_fact import (
    CanonicalFact,
    CanonicalFactKind,
    ExtractedField,
    ExtractionStatus,
    TimezoneProvenance,
    build_timezone_provenance,
)
from tarka.core.timezones import parse_datetime_forensic
from tarka.core.entity_resolution import (
    EntityResolver,
    EntityProfile,
    EntityMatch,
    normalize_msisdn,
    normalize_vpa,
    normalize_txn_ref,
    normalize_account_suffix,
    normalize_person_name,
    normalize_imei,
)

from tarka.core.correlations import (
    CorrelationEngine,
    EventCorrelation,
    EvidenceGap,
)
from tarka.core.analysis_run import (
    AnalysisRun,
    RunComparison,
    CounterfactualEngine,
)
from tarka.parsers.cdr import CDRParser
from tarka.parsers.bank_upi import BankUPIParser
from tarka.parsers.whatsapp import WhatsAppParser
from tarka.parsers.exif_triage import EXIFTriageParser

# Forensic integrity notice used across Artifact and Evidence DNA models
INTEGRITY_LIMITATION_DISCLOSURE = (
    "A cryptographic SHA-256 hash confirms bitstream preservation across transfer and storage. "
    "It does not establish origin authenticity, truthful authorship, or the absence of fabrication prior to seizure."
)

EVIDENCE_DNA_DISCLOSURE = (
    "Record extracted under deterministic parser rules. "
    "Separates verbatim source text from parsed and inferred values. "
    "Does not constitute legal affidavit or proof of human identity."
)


class Case(BaseModel):
    """Forensic investigation case workspace."""
    case_id: str = Field(description="Unique identifier for the case (e.g. CASE-2026-001 or workspace)")
    title: str = Field(description="Descriptive title of the investigation")
    description: str = Field(default="", description="Summary of the incident or case context")
    investigator: str = Field(default="Forensic Officer", description="Lead investigating officer or forensic examiner")
    jurisdiction: str = Field(default="Cyber Crime Branch", description="Designated jurisdiction or unit")
    created_at_iso: str = Field(description="UTC ISO-8601 creation timestamp")
    status: str = Field(default="ACTIVE", description="Case status: ACTIVE, UNDER_REVIEW, or ARCHIVED")
    artifact_count: int = Field(default=0, description="Total registered artifacts")
    dna_count: int = Field(default=0, description="Total extracted Evidence DNA records")
    custody_chain_head: Optional[str] = Field(default=None, description="Current SHA-256 custody ledger anchor")
    integrity_limitation: str = Field(
        default=INTEGRITY_LIMITATION_DISCLOSURE,
        description="Explicit limitation regarding cryptographic hashes and case evidence",
    )


class Artifact(BaseModel):
    """Immutable registered evidence file container."""
    artifact_id: str = Field(description="Deterministic artifact identifier (e.g. ART-001)")
    case_id: str = Field(description="Associated case identifier")
    filename: str = Field(description="Original filename at time of intake")
    sha256: str = Field(description="SHA-256 hex digest computed over original file bitstream")
    file_size_bytes: int = Field(ge=0, description="Exact file size in bytes")
    mime_type: str = Field(description="MIME type or file classification")
    source_device: Optional[str] = Field(default=None, description="Hardware anchor, phone IMEI, or storage device identifier")
    source_tier: TrustTier = Field(default=TrustTier.T1, description="Trust tier (T1 Third-Party, T2 Device Log, T3 User-Controllable)")
    intake_officer: str = Field(default="Forensic Examiner", description="Officer who logged the evidence")
    intake_timestamp_iso: str = Field(description="UTC ISO-8601 intake timestamp")
    custody_chain_sequence: int = Field(ge=0, description="Custody ledger sequence number sealing intake")
    storage_path: str = Field(description="Relative path to immutable preserved artifact file on disk")
    intake_notes: Optional[str] = Field(default=None, description="Custody notes (e.g. seizure bag number, chain notes)")
    status: str = Field(default="REGISTERED", description="Status: REGISTERED, PARSED, REVIEW_PENDING, or VERIFIED")
    dna_count: int = Field(default=0, description="Number of Evidence DNA records extracted from this artifact")
    integrity_limitation: str = Field(
        default=INTEGRITY_LIMITATION_DISCLOSURE,
        description="Explicit limitation text regarding SHA-256 and evidence authenticity",
    )
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Artifact metadata including OCR coverage")

    @field_validator("sha256")
    def validate_sha256(cls, v: str) -> str:
        clean = v.strip().lower()
        if len(clean) != 64 or not all(c in "0123456789abcdef" for c in clean):
            raise ValueError(f"Invalid SHA-256 digest: {v}")
        return clean


class EvidenceDNA(BaseModel):
    """Structured Evidence DNA model separating verbatim source data, extracted values, and inferences."""
    evidence_id: str = Field(description="Unique Evidence DNA identifier (e.g. DNA-ART-001-001)")
    artifact_id: str = Field(description="Parent artifact identifier providing source bitstream")
    case_id: str = Field(description="Associated case identifier")
    record_index: int = Field(ge=1, description="1-based line number or row offset in the original source artifact")
    kind: FactKind = Field(description="Categorical kind of evidence event")

    # 1. Original Source Data (verbatim, unaltered from raw file)
    source_raw_text: str = Field(description="Verbatim, unedited text content of the record as found in the artifact")
    source_line_ref: str = Field(description="Human-auditable locator in original file (e.g. line:14, row:2)")
    source_field_path: Optional[str] = Field(default=None, description="JSON path or column locator if applicable")

    # 2. Extracted Data (deterministic parser output)
    event_timestamp_iso: Optional[str] = Field(default=None, description="Normalized ISO-8601 timestamp")
    event_timestamp_epoch: Optional[float] = Field(default=None, description="Unix epoch timestamp in seconds")
    time_window_start_epoch: Optional[float] = Field(default=None, description="Earliest temporal bound in epoch seconds")
    time_window_end_epoch: Optional[float] = Field(default=None, description="Latest temporal bound in epoch seconds")
    source_entity: Optional[str] = Field(default=None, description="Originating entity identifier (caller, sender, payer)")
    target_entity: Optional[str] = Field(default=None, description="Destination entity identifier (callee, recipient, payee)")
    latitude: Optional[float] = Field(default=None, description="Centroid latitude in decimal degrees")
    longitude: Optional[float] = Field(default=None, description="Centroid longitude in decimal degrees")
    uncertainty_radius_meters: Optional[float] = Field(default=None, description="Spatial uncertainty radius in meters")
    auth_track: AuthType = Field(default=AuthType.PASSIVE, description="Separates passive device presence from active human authentication")
    trust_tier: TrustTier = Field(default=TrustTier.T1, description="Source trust tier")
    clock_domain: str = Field(default="clk_default", description="Associated clock reference domain")
    amount: Optional[float] = Field(default=None, description="Monetary value if financial transaction")

    # Phase 2 Fine-Grained Extracted Fields and Identifiers
    parser_name: Optional[str] = Field(default=None, description="Name of parser responsible for extraction")
    parser_version: Optional[str] = Field(default="1.0.0", description="Parser version string")
    parser_warnings: List[str] = Field(default_factory=list, description="Parser warnings or notes")
    extracted_fields: List[ExtractedField] = Field(
        default_factory=list,
        description="Fine-grained fields with raw and normalized separation and extraction status",
    )
    identifiers: Dict[str, str] = Field(
        default_factory=dict,
        description="Extracted normalized identifiers (msisdn, vpa, rrn, account_suffix, imei)",
    )

    # 3. Inferred Data (clearly flagged and separated from extracted data)
    inferred_attributes: Dict[str, Any] = Field(
        default_factory=dict,
        description="Attributes derived via heuristics or model assumptions rather than explicit raw values",
    )
    inference_rationale: Optional[str] = Field(
        default=None,
        description="Explicit explanation of why and how inferences were applied",
    )
    has_inferences: bool = Field(default=False, description="Flag indicating presence of inferred attributes")

    # 4. Reviewable Fields & Audit Status (all fields open to human review)
    review_status: str = Field(default="UNREVIEWED", description="Audit status: UNREVIEWED, ACCEPTED, FLAGGED, or REJECTED")
    reviewed_by: Optional[str] = Field(default=None, description="Name or identifier of reviewing examiner")
    review_notes: Optional[str] = Field(default=None, description="Examiner comments or review findings")
    review_timestamp_iso: Optional[str] = Field(default=None, description="ISO-8601 timestamp when review was recorded")
    field_overrides: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any manual corrections made by examiner with reason",
    )
    is_reviewable: bool = Field(default=True, description="Always true: all fields are open to examiner review")

    # 5. Integrity Limitation Notice
    integrity_limitation: str = Field(
        default=EVIDENCE_DNA_DISCLOSURE,
        description="Explicit notice stating model and provenance boundaries",
    )

    def to_fact(self, source_file: str, sha256: str) -> Fact:
        """Converts an accepted Evidence DNA record into a canonical TARKA Fact for SMT reconstruction."""
        reported = self.event_timestamp_epoch
        if reported is None and self.event_timestamp_iso and self.event_timestamp_iso.strip():
            # Deterministically normalize raw ISO/telecom/bank timestamp to UTC epoch seconds
            parsed = parse_datetime_forensic(self.event_timestamp_iso)
            reported = parsed.utc_epoch
        if reported is None:
            reported = 0.0

        start = self.time_window_start_epoch if self.time_window_start_epoch is not None else reported
        end = self.time_window_end_epoch if self.time_window_end_epoch is not None else reported

        tw = TimeWindow(start_epoch=start, end_epoch=end, reported_epoch=reported)
        reg = None
        if self.latitude is not None and self.longitude is not None:
            reg = GeographicRegion(
                latitude=self.latitude,
                longitude=self.longitude,
                radius_meters=self.uncertainty_radius_meters or 100.0,
            )

        refs = []
        if self.source_entity:
            refs.append(self.source_entity)
        if self.target_entity:
            refs.append(self.target_entity)

        return Fact(
            id=self.evidence_id,
            source_file=source_file,
            sha256=sha256,
            line_ref=self.source_line_ref,
            kind=self.kind,
            time_window=tw,
            region=reg,
            tier=self.trust_tier,
            device_id=self.source_entity or "DEV_UNKNOWN",
            clock_id=self.clock_domain,
            entity_refs=refs,
            auth_type=self.auth_track,
            raw_payload={
                "source_raw_text": self.source_raw_text,
                "inferred_attributes": self.inferred_attributes,
                "review_status": self.review_status,
                "evidence_id": self.evidence_id,
                "artifact_id": self.artifact_id,
                "identifiers": self.identifiers,
                "amount": self.amount,
                "is_timestamp_missing": (
                    self.event_timestamp_epoch is None
                    and not (self.event_timestamp_iso and self.event_timestamp_iso.strip())
                ),
            },
        )

    def to_canonical_fact(self, source_filename: str, sha256: str) -> CanonicalFact:
        """Converts this Evidence DNA into a rich, reviewable CanonicalFact."""
        kind_map = {
            FactKind.WA_MESSAGE: CanonicalFactKind.CHAT_MESSAGE,
            FactKind.UPI_PAYMENT: CanonicalFactKind.PAYMENT_REQUEST if self.inferred_attributes.get("is_payment_request") else CanonicalFactKind.BANK_TRANSACTION,
            FactKind.BANK_TXN: CanonicalFactKind.BANK_TRANSACTION,
            FactKind.CDR_CALL: CanonicalFactKind.CDR_CALL,
            FactKind.CDR_SMS: CanonicalFactKind.CDR_CALL,
            FactKind.CDR_DATA: CanonicalFactKind.CDR_CALL,
            FactKind.EXIF_PHOTO: CanonicalFactKind.MEDIA_METADATA,
            FactKind.CLAIM: CanonicalFactKind.MEDIA_METADATA if self.inferred_attributes.get("is_media_claim") else CanonicalFactKind.CHAT_MESSAGE,
        }
        c_kind = kind_map.get(self.kind, CanonicalFactKind.CHAT_MESSAGE)

        raw_ts = self.event_timestamp_iso or ""
        time_prov = build_timezone_provenance(raw_ts)
        if self.event_timestamp_epoch is not None:
            time_prov.utc_epoch = self.event_timestamp_epoch
            if self.event_timestamp_iso:
                time_prov.utc_iso = self.event_timestamp_iso
            time_prov.is_inferred = False

        summary = f"{self.kind.value} from {self.source_line_ref}"
        if self.source_entity and self.target_entity:
            summary = f"{self.kind.value}: {self.source_entity} -> {self.target_entity}"
        elif self.source_entity:
            summary = f"{self.kind.value}: {self.source_entity}"
        if self.amount:
            summary += f" (₹{self.amount:,.2f})"

        return CanonicalFact(
            fact_id=f"FACT-{self.evidence_id}",
            case_id=self.case_id,
            artifact_id=self.artifact_id,
            evidence_id=self.evidence_id,
            kind=c_kind,
            source_filename=source_filename,
            source_location=self.source_line_ref,
            sha256=sha256,
            time_provenance=time_prov,
            trust_tier=self.trust_tier,
            auth_track=self.auth_track,
            primary_entity=self.source_entity,
            secondary_entity=self.target_entity,
            amount=self.amount,
            identifiers=self.identifiers,
            extracted_fields=self.extracted_fields,
            summary=summary,
            raw_source_snippet=self.source_raw_text,
            inferred_notes=self.inference_rationale,
            review_status=self.review_status,
            reviewed_by=self.reviewed_by,
            review_notes=self.review_notes,
        )


class CaseStore:
    """Manages case directories, immutable artifact file storage, deduplication, and custody tracking."""

    def __init__(self, base_dir: str | Path = "data/cases"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize(self, val: str) -> str:
        """Sanitizes identifiers and filenames to prevent path traversal."""
        base = Path(val).name
        clean = re.sub(r"[^\w\.-]", "_", base)
        clean = re.sub(r"\.{2,}", "_", clean)
        clean = clean.strip("._")
        return clean or "item"

    def get_case_dir(self, case_id: str) -> Path:
        cd = self.base_dir / self._sanitize(case_id or "workspace")
        cd.mkdir(parents=True, exist_ok=True)
        return cd

    def get_artifacts_dir(self, case_id: str) -> Path:
        ad = self.get_case_dir(case_id) / "artifacts"
        ad.mkdir(parents=True, exist_ok=True)
        return ad

    def get_ledger(self, case_id: str) -> CustodyLedger:
        db_path = self.get_case_dir(case_id) / "custody.db"
        return CustodyLedger(db_path=str(db_path))

    def create_case(
        self,
        case_id: str,
        title: str,
        description: str = "",
        investigator: str = "Forensic Officer",
        jurisdiction: str = "Cyber Crime Branch",
    ) -> Case:
        """Creates a new case directory, initial custody ledger, and case metadata."""
        clean_id = self._sanitize(case_id)
        cd = self.get_case_dir(clean_id)
        case_file = cd / "case.json"

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        ledger = self.get_ledger(clean_id)

        case = Case(
            case_id=clean_id,
            title=title,
            description=description,
            investigator=investigator,
            jurisdiction=jurisdiction,
            created_at_iso=now_iso,
            status="ACTIVE",
            artifact_count=0,
            dna_count=0,
            custody_chain_head=ledger.get_chain_head_hash(),
        )

        with open(case_file, "w", encoding="utf-8") as f:
            json.dump(case.model_dump(mode="json"), f, indent=2)

        ledger.append_action(
            action="CREATE_CASE",
            payload_data={
                "case_id": clean_id,
                "title": title,
                "investigator": investigator,
                "jurisdiction": jurisdiction,
            },
            fact_id=clean_id,
            timestamp_iso=now_iso,
        )

        return case

    def save_case(self, case: Case) -> None:
        """Saves or updates a case directly in the case store."""
        clean_id = self._sanitize(case.case_id)
        cd = self.get_case_dir(clean_id)
        with open(cd / "case.json", "w", encoding="utf-8") as f:
            json.dump(case.model_dump(mode="json"), f, indent=2)

    def get_case(self, case_id: str) -> Optional[Case]:
        cd = self.get_case_dir(case_id)
        case_file = cd / "case.json"
        if not case_file.exists():
            return None
        try:
            with open(case_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return Case.model_validate(data)
        except Exception:
            return None

    def list_cases(self) -> List[Case]:
        cases: List[Case] = []
        if not self.base_dir.exists():
            return []

        for child in sorted(self.base_dir.iterdir()):
            if child.is_dir():
                c = self.get_case(child.name)
                if c:
                    cases.append(c)
        return cases

    def clean_case(self, case_id: str) -> None:
        """Completely clears all artifacts, DNA, facts, custody records, and analysis runs for the case, resetting it to a clean empty state."""
        import shutil
        clean_case_id = self._sanitize(case_id)
        cd = self.get_case_dir(clean_case_id)
        
        # 1. Clear artifacts directory
        ad = cd / "artifacts"
        if ad.exists():
            shutil.rmtree(ad, ignore_errors=True)
        ad.mkdir(parents=True, exist_ok=True)
        
        # 2. Clear analysis runs, ocr, reports, runs
        for sub in ["analysis_runs", "ocr", "reports", "runs"]:
            sub_dir = cd / sub
            if sub_dir.exists():
                shutil.rmtree(sub_dir, ignore_errors=True)
                
        # 3. Clear all database files (custody.db, wal, journal, etc.)
        for db_file in cd.glob("*.db*"):
            try:
                db_file.unlink()
            except Exception:
                pass
        for sqlite_file in cd.glob("*.sqlite*"):
            try:
                sqlite_file.unlink()
            except Exception:
                pass
                
        # 4. Clear all json files EXCEPT case.json
        for j_file in cd.glob("*.json"):
            if j_file.name != "case.json":
                try:
                    j_file.unlink()
                except Exception:
                    pass
                    
        # 5. Reset case.json metadata
        case_obj = self.get_case(clean_case_id)
        if case_obj:
            case_obj.artifact_count = 0
            case_obj.dna_count = 0
            case_obj.custody_chain_head = ""
            case_file = cd / "case.json"
            with open(case_file, "w", encoding="utf-8") as f:
                json.dump(case_obj.model_dump(mode="json"), f, indent=2)

    def list_artifacts(self, case_id: str) -> List[Artifact]:
        cd = self.get_case_dir(case_id)
        art_file = cd / "artifacts.json"
        if not art_file.exists():
            return []
        try:
            with open(art_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [Artifact.model_validate(item) for item in data]
        except Exception:
            return []

    def get_artifact(self, case_id: str, artifact_id: str) -> Optional[Artifact]:
        for art in self.list_artifacts(case_id):
            if art.artifact_id == artifact_id:
                return art
        return None

    def save_artifact(self, artifact: Artifact) -> None:
        """Saves or updates an artifact directly in the case store."""
        clean_case_id = self._sanitize(artifact.case_id)
        existing = [a for a in self.list_artifacts(clean_case_id) if a.artifact_id != artifact.artifact_id]
        existing.append(artifact)
        cd = self.get_case_dir(clean_case_id)
        with open(cd / "artifacts.json", "w", encoding="utf-8") as f:
            json.dump([a.model_dump(mode="json") for a in existing], f, indent=2)

    def list_evidence_dna(self, case_id: str, artifact_id: Optional[str] = None) -> List[EvidenceDNA]:
        cd = self.get_case_dir(case_id)
        dna_file = cd / "evidence_dna.json"
        if not dna_file.exists():
            return []
        try:
            with open(dna_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            records = [EvidenceDNA.model_validate(item) for item in data]
            if artifact_id:
                records = [r for r in records if r.artifact_id == artifact_id]
            return records
        except Exception:
            return []

    def get_evidence_dna(self, case_id: str, evidence_id: str) -> Optional[EvidenceDNA]:
        for rec in self.list_evidence_dna(case_id):
            if rec.evidence_id == evidence_id:
                return rec
        return None

    def register_artifact(
        self,
        case_id: str,
        filename: str,
        file_bytes: bytes,
        source_tier: TrustTier = TrustTier.T1,
        source_device: Optional[str] = None,
        intake_officer: str = "Forensic Examiner",
        intake_notes: Optional[str] = None,
    ) -> tuple[Artifact, bool, List[EvidenceDNA]]:
        clean_case_id = self._sanitize(case_id)
        self.get_case_dir(clean_case_id)

        sha256 = hashlib.sha256(file_bytes).hexdigest()
        file_size = len(file_bytes)

        existing_artifacts = self.list_artifacts(clean_case_id)
        for existing in existing_artifacts:
            if existing.sha256 == sha256:
                existing_dna = self.list_evidence_dna(clean_case_id, existing.artifact_id)
                return existing, True, existing_dna

        art_num = len(existing_artifacts) + 1
        artifact_id = f"ART-{art_num:03d}-{sha256[:8].upper()}"

        guessed_type, _ = mimetypes.guess_type(filename)
        mime_type = guessed_type or "application/octet-stream"

        artifacts_dir = self.get_artifacts_dir(clean_case_id)
        clean_filename = self._sanitize(filename)
        stored_filename = f"{sha256[:16]}_{clean_filename}"
        storage_file_path = artifacts_dir / stored_filename

        with open(storage_file_path, "wb") as f:
            f.write(file_bytes)

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        ledger = self.get_ledger(clean_case_id)

        custody_entry = ledger.append_action(
            action="REGISTER_ARTIFACT",
            payload_data={
                "artifact_id": artifact_id,
                "filename": filename,
                "sha256": sha256,
                "file_size_bytes": file_size,
                "source_tier": source_tier.value,
                "source_device": source_device or "",
                "intake_officer": intake_officer,
                "storage_filename": stored_filename,
            },
            fact_id=artifact_id,
            timestamp_iso=now_iso,
        )

        artifact = Artifact(
            artifact_id=artifact_id,
            case_id=clean_case_id,
            filename=filename,
            sha256=sha256,
            file_size_bytes=file_size,
            mime_type=mime_type,
            source_device=source_device,
            source_tier=source_tier,
            intake_officer=intake_officer,
            intake_timestamp_iso=now_iso,
            custody_chain_sequence=custody_entry.seq,
            storage_path=f"artifacts/{stored_filename}",
            intake_notes=intake_notes,
            status="REGISTERED",
            dna_count=0,
        )

        dna_items = self._extract_dna_records(artifact, file_bytes)
        artifact.dna_count = len(dna_items)
        if dna_items:
            artifact.status = "PARSED"

        existing_artifacts.append(artifact)
        cd = self.get_case_dir(clean_case_id)
        with open(cd / "artifacts.json", "w", encoding="utf-8") as f:
            json.dump([a.model_dump(mode="json") for a in existing_artifacts], f, indent=2)

        existing_dna = self.list_evidence_dna(clean_case_id)
        existing_dna.extend(dna_items)
        with open(cd / "evidence_dna.json", "w", encoding="utf-8") as f:
            json.dump([d.model_dump(mode="json") for d in existing_dna], f, indent=2)

        case_obj = self.get_case(clean_case_id)
        if case_obj:
            case_obj.artifact_count = len(existing_artifacts)
            case_obj.dna_count = len(existing_dna)
            case_obj.custody_chain_head = ledger.get_chain_head_hash()
            with open(cd / "case.json", "w", encoding="utf-8") as f:
                json.dump(case_obj.model_dump(mode="json"), f, indent=2)

        return artifact, False, dna_items

    def _extract_dna_records(self, artifact: Artifact, file_bytes: bytes) -> List[EvidenceDNA]:
        """Harmonized Phase 2 extractor connecting WhatsApp, Bank/UPI, CDR, and EXIF/Claim parsers."""
        dna_list: List[EvidenceDNA] = []
        ext = Path(artifact.filename).suffix.lower()

        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception:
                text = ""

        # Binary or EXIF Image
        if not text:
            if ext in [".jpg", ".jpeg", ".png", ".heic"]:
                try:
                    triage = EXIFTriageParser().triage_image_bytes(file_bytes, filename=artifact.filename)
                    extracted_fields = [
                        ExtractedField(
                            case_id=artifact.case_id,
                            artifact_id=artifact.artifact_id,
                            field_name="image_format",
                            parser_name="exif_triage",
                            source_filename=artifact.filename,
                            source_location="header:bytes_0_16",
                            raw_source_value=ext[1:].upper(),
                            normalized_value=ext[1:].upper(),
                            extraction_status=ExtractionStatus.DIRECTLY_RECORDED,
                        )
                    ]
                    dna = EvidenceDNA(
                        evidence_id=f"DNA-{artifact.artifact_id}-001",
                        artifact_id=artifact.artifact_id,
                        case_id=artifact.case_id,
                        record_index=1,
                        kind=FactKind.EXIF_PHOTO,
                        source_raw_text=f"[Binary image: {artifact.filename}, {artifact.file_size_bytes} bytes]",
                        source_line_ref="byte:0",
                        trust_tier=artifact.source_tier,
                        auth_track=AuthType.PASSIVE,
                        parser_name="exif_triage",
                        extracted_fields=extracted_fields,
                        has_inferences=triage.has_structural_anomalies,
                        inference_rationale="Structural anomalies flagged in metadata" if triage.has_structural_anomalies else None,
                    )
                    dna_list.append(dna)
                    return dna_list
                except Exception:
                    pass

            dna = EvidenceDNA(
                evidence_id=f"DNA-{artifact.artifact_id}-001",
                artifact_id=artifact.artifact_id,
                case_id=artifact.case_id,
                record_index=1,
                kind=FactKind.CLAIM,
                source_raw_text=f"[Binary bitstream: {artifact.filename}, {artifact.file_size_bytes} bytes]",
                source_line_ref="byte:0",
                trust_tier=artifact.source_tier,
                auth_track=AuthType.PASSIVE,
                has_inferences=False,
            )
            dna_list.append(dna)
            return dna_list

        # JSON Metadata / Claim File
        if ext == ".json":
            try:
                js_data = json.loads(text)
                if isinstance(js_data, dict):
                    # Check if screenshot or OCR metadata claim
                    claimed_amt = js_data.get("claimed_amount") or js_data.get("amount")
                    claimed_rrn = js_data.get("claimed_rrn") or js_data.get("rrn")
                    claimed_vpa = js_data.get("claimed_payee_vpa") or js_data.get("payee_vpa") or js_data.get("vpa")
                    claimed_ts = js_data.get("claimed_timestamp") or js_data.get("timestamp")

                    extracted_fields = []
                    identifiers = {}
                    if claimed_amt is not None:
                        try:
                            f_amt = float(claimed_amt)
                            extracted_fields.append(
                                ExtractedField(
                                    case_id=artifact.case_id,
                                    artifact_id=artifact.artifact_id,
                                    field_name="claimed_amount",
                                    parser_name="ocr_claim_parser",
                                    source_filename=artifact.filename,
                                    source_location="json:claimed_amount",
                                    raw_source_value=str(claimed_amt),
                                    normalized_value=f_amt,
                                    extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                                )
                            )
                        except (ValueError, TypeError):
                            f_amt = None
                    else:
                        f_amt = None

                    if claimed_rrn:
                        norm_r = normalize_txn_ref(str(claimed_rrn))
                        if norm_r:
                            identifiers["rrn"] = norm_r
                            extracted_fields.append(
                                ExtractedField(
                                    case_id=artifact.case_id,
                                    artifact_id=artifact.artifact_id,
                                    field_name="claimed_rrn",
                                    parser_name="ocr_claim_parser",
                                    source_filename=artifact.filename,
                                    source_location="json:claimed_rrn",
                                    raw_source_value=str(claimed_rrn),
                                    normalized_value=norm_r,
                                    extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                                )
                            )

                    if claimed_vpa:
                        norm_v = normalize_vpa(str(claimed_vpa))
                        if norm_v:
                            identifiers["vpa"] = norm_v
                            extracted_fields.append(
                                ExtractedField(
                                    case_id=artifact.case_id,
                                    artifact_id=artifact.artifact_id,
                                    field_name="claimed_payee_vpa",
                                    parser_name="ocr_claim_parser",
                                    source_filename=artifact.filename,
                                    source_location="json:claimed_payee_vpa",
                                    raw_source_value=str(claimed_vpa),
                                    normalized_value=norm_v,
                                    extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                                )
                            )

                    dna = EvidenceDNA(
                        evidence_id=f"DNA-{artifact.artifact_id}-001",
                        artifact_id=artifact.artifact_id,
                        case_id=artifact.case_id,
                        record_index=1,
                        kind=FactKind.CLAIM,
                        source_raw_text=text[:500],
                        source_line_ref="line:1",
                        event_timestamp_iso=claimed_ts,
                        trust_tier=artifact.source_tier,
                        auth_track=AuthType.ACTIVE,
                        amount=f_amt,
                        parser_name="ocr_claim_parser",
                        extracted_fields=extracted_fields,
                        identifiers=identifiers,
                        inferred_attributes={"is_media_claim": True},
                        inference_rationale="Derived from digital image screenshot / OCR claim metadata.",
                        has_inferences=True,
                    )
                    dna_list.append(dna)
                    return dna_list
            except Exception:
                pass

        raw_lines = text.splitlines()

        # Handle CSV / TSV files
        if ext in [".csv", ".tsv"]:
            delimiter = "\t" if ext == ".tsv" else ","
            import csv
            reader = list(csv.reader(raw_lines, delimiter=delimiter))
            if not reader:
                return []
            header = [c.strip().lower() for c in reader[0]]
            header_str = " ".join(header)

            is_cdr = any(k in header_str for k in ["call_type", "calling_number", "first_cell", "duration"])
            is_bank = any(k in header_str for k in ["upi", "vpa", "rrn", "txn_id", "debit", "credit", "balance"])

            if is_bank:
                # Use BankUPIParser
                parser_name = "bank_upi"
                for idx, row in enumerate(reader[1:], start=2):
                    if not row or not any(row):
                        continue
                    raw_line_text = raw_lines[idx - 1] if idx - 1 < len(raw_lines) else delimiter.join(row)
                    row_dict = dict(zip(header, row))

                    rrn_raw = row_dict.get("rrn") or row_dict.get("txn_id") or row_dict.get("transaction_id")
                    payer_vpa_raw = row_dict.get("payer_vpa") or row_dict.get("vpa")
                    payee_vpa_raw = row_dict.get("payee_vpa")
                    debit_raw = row_dict.get("debit")
                    credit_raw = row_dict.get("credit")
                    amt_raw = debit_raw or credit_raw or row_dict.get("amount")
                    date_raw = row_dict.get("date") or row_dict.get("timestamp")
                    time_raw = row_dict.get("time")

                    ts_str = f"{date_raw} {time_raw}".strip() if date_raw and time_raw else (date_raw or time_raw)

                    # Normalize fields
                    clean_amt = BankUPIParser._clean_amount(amt_raw) if amt_raw else None
                    amt_float = float(clean_amt) if clean_amt is not None else None
                    norm_rrn = normalize_txn_ref(rrn_raw) if rrn_raw else None
                    norm_payer = normalize_vpa(payer_vpa_raw) if payer_vpa_raw else None
                    norm_payee = normalize_vpa(payee_vpa_raw) if payee_vpa_raw else None

                    extracted_fields = []
                    identifiers = {}
                    if norm_rrn:
                        identifiers["rrn"] = norm_rrn
                        extracted_fields.append(
                            ExtractedField(
                                case_id=artifact.case_id,
                                artifact_id=artifact.artifact_id,
                                field_name="rrn",
                                parser_name=parser_name,
                                source_filename=artifact.filename,
                                source_location=f"row:{idx}",
                                raw_source_value=str(rrn_raw),
                                normalized_value=norm_rrn,
                                extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                            )
                        )
                    if norm_payee:
                        identifiers["vpa"] = norm_payee
                        extracted_fields.append(
                            ExtractedField(
                                case_id=artifact.case_id,
                                artifact_id=artifact.artifact_id,
                                field_name="payee_vpa",
                                parser_name=parser_name,
                                source_filename=artifact.filename,
                                source_location=f"row:{idx}",
                                raw_source_value=str(payee_vpa_raw),
                                normalized_value=norm_payee,
                                extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                            )
                        )
                    if amt_float is not None:
                        extracted_fields.append(
                            ExtractedField(
                                case_id=artifact.case_id,
                                artifact_id=artifact.artifact_id,
                                field_name="amount",
                                parser_name=parser_name,
                                source_filename=artifact.filename,
                                source_location=f"row:{idx}",
                                raw_source_value=str(amt_raw),
                                normalized_value=amt_float,
                                extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                            )
                        )
                    if ts_str:
                        extracted_fields.append(
                            ExtractedField(
                                case_id=artifact.case_id,
                                artifact_id=artifact.artifact_id,
                                field_name="timestamp",
                                parser_name=parser_name,
                                source_filename=artifact.filename,
                                source_location=f"row:{idx}",
                                raw_source_value=str(ts_str),
                                normalized_value=ts_str,
                                extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                            )
                        )

                    dna = EvidenceDNA(
                        evidence_id=f"DNA-{artifact.artifact_id}-{idx:03d}",
                        artifact_id=artifact.artifact_id,
                        case_id=artifact.case_id,
                        record_index=idx,
                        kind=FactKind.BANK_TXN,
                        source_raw_text=raw_line_text,
                        source_line_ref=f"row:{idx}",
                        event_timestamp_iso=ts_str,
                        source_entity=norm_payer,
                        target_entity=norm_payee,
                        amount=amt_float,
                        auth_track=AuthType.ACTIVE,
                        trust_tier=artifact.source_tier,
                        parser_name=parser_name,
                        extracted_fields=extracted_fields,
                        identifiers=identifiers,
                        has_inferences=False,
                    )
                    dna_list.append(dna)
                return dna_list

            elif is_cdr:
                # Use CDRParser
                parser_name = "cdr"
                for idx, row in enumerate(reader[1:], start=2):
                    if not row or not any(row):
                        continue
                    raw_line_text = raw_lines[idx - 1] if idx - 1 < len(raw_lines) else delimiter.join(row)
                    row_dict = dict(zip(header, row))

                    caller_raw = row_dict.get("calling_number") or row_dict.get("caller") or row_dict.get("msisdn")
                    callee_raw = row_dict.get("called_number") or row_dict.get("callee")
                    imei_raw = row_dict.get("imei")
                    ts_str = row_dict.get("timestamp") or row_dict.get("date")

                    norm_caller = normalize_msisdn(caller_raw) if caller_raw else None
                    norm_callee = normalize_msisdn(callee_raw) if callee_raw else None
                    norm_imei = normalize_imei(imei_raw) if imei_raw else None

                    extracted_fields = []
                    identifiers = {}
                    if norm_caller:
                        identifiers["msisdn"] = norm_caller
                        extracted_fields.append(
                            ExtractedField(
                                case_id=artifact.case_id,
                                artifact_id=artifact.artifact_id,
                                field_name="calling_number",
                                parser_name=parser_name,
                                source_filename=artifact.filename,
                                source_location=f"row:{idx}",
                                raw_source_value=str(caller_raw),
                                normalized_value=norm_caller,
                                extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                            )
                        )
                    if norm_callee:
                        extracted_fields.append(
                            ExtractedField(
                                case_id=artifact.case_id,
                                artifact_id=artifact.artifact_id,
                                field_name="called_number",
                                parser_name=parser_name,
                                source_filename=artifact.filename,
                                source_location=f"row:{idx}",
                                raw_source_value=str(callee_raw),
                                normalized_value=norm_callee,
                                extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                            )
                        )
                    if norm_imei:
                        identifiers["imei"] = norm_imei
                        extracted_fields.append(
                            ExtractedField(
                                case_id=artifact.case_id,
                                artifact_id=artifact.artifact_id,
                                field_name="imei",
                                parser_name=parser_name,
                                source_filename=artifact.filename,
                                source_location=f"row:{idx}",
                                raw_source_value=str(imei_raw),
                                normalized_value=norm_imei,
                                extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                            )
                        )

                    dna = EvidenceDNA(
                        evidence_id=f"DNA-{artifact.artifact_id}-{idx:03d}",
                        artifact_id=artifact.artifact_id,
                        case_id=artifact.case_id,
                        record_index=idx,
                        kind=FactKind.CDR_CALL,
                        source_raw_text=raw_line_text,
                        source_line_ref=f"row:{idx}",
                        event_timestamp_iso=ts_str,
                        source_entity=norm_caller,
                        target_entity=norm_callee,
                        auth_track=AuthType.PASSIVE,
                        trust_tier=artifact.source_tier,
                        parser_name=parser_name,
                        extracted_fields=extracted_fields,
                        identifiers=identifiers,
                        has_inferences=False,
                    )
                    dna_list.append(dna)
                return dna_list

        # Handle TXT / Chat Logs
        elif ext in [".txt", ".log"]:
            parser_name = "whatsapp"
            for idx, line in enumerate(raw_lines, start=1):
                clean = line.strip()
                if not clean:
                    continue

                extracted_fields = []
                identifiers = {}
                inferred_attrs = {}
                has_inf = False
                rationale = None

                # Detect WhatsApp timestamp format: [DD/MM/YYYY, HH:MM:SS] Sender: Message
                # or DD/MM/YYYY, HH:MM - Sender: Message
                wa_match = re.search(
                    r"^(?:\[)?(?P<dt>\d{1,4}[/\-\.]\d{1,2}[/\-\.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)(?:\])?(?:\s+-\s+|\s+)(?P<sender>[^:]+):\s*(?P<msg>.*)$",
                    clean,
                )

                if wa_match:
                    dt_raw = wa_match.group("dt")
                    sender_raw = wa_match.group("sender").strip()
                    msg_body = wa_match.group("msg").strip()

                    # Check date ambiguity in chat exports
                    if re.search(r"^\d{1,2}/\d{1,2}/\d{2,4}", dt_raw):
                        date_match = re.match(r"^(\d{1,2})/(\d{1,2})/\d{2,4}", dt_raw)
                        if date_match:
                            d1, d2 = int(date_match.group(1)), int(date_match.group(2))
                            if d1 <= 12 and d2 <= 12:
                                inferred_attrs["date_ambiguity"] = "DD/MM vs MM/DD undecidable"
                                rationale = "Whole-file date tokens <= 12; widened temporal bounding interval under stated model."
                                has_inf = True


                    norm_sender_phone = normalize_msisdn(sender_raw)
                    if norm_sender_phone:
                        identifiers["msisdn"] = norm_sender_phone
                    else:
                        norm_name = normalize_person_name(sender_raw)
                        if norm_name:
                            identifiers["name"] = norm_name

                    # Record extracted fields
                    extracted_fields.append(
                        ExtractedField(
                            case_id=artifact.case_id,
                            artifact_id=artifact.artifact_id,
                            field_name="timestamp",
                            parser_name=parser_name,
                            source_filename=artifact.filename,
                            source_location=f"line:{idx}",
                            raw_source_value=dt_raw,
                            normalized_value=dt_raw,
                            extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                        )
                    )
                    extracted_fields.append(
                        ExtractedField(
                            case_id=artifact.case_id,
                            artifact_id=artifact.artifact_id,
                            field_name="sender",
                            parser_name=parser_name,
                            source_filename=artifact.filename,
                            source_location=f"line:{idx}",
                            raw_source_value=sender_raw,
                            normalized_value=norm_sender_phone or sender_raw,
                            extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                        )
                    )
                    extracted_fields.append(
                        ExtractedField(
                            case_id=artifact.case_id,
                            artifact_id=artifact.artifact_id,
                            field_name="message_text",
                            parser_name=parser_name,
                            source_filename=artifact.filename,
                            source_location=f"line:{idx}",
                            raw_source_value=msg_body,
                            normalized_value=msg_body,
                            extraction_status=ExtractionStatus.DIRECTLY_RECORDED,
                        )
                    )

                    # Extract payment request signals (VPA, amount, RRN/ref)
                    amt_found: Optional[float] = None
                    amt_match = re.search(r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)", msg_body, re.IGNORECASE)
                    if amt_match:
                        try:
                            clean_amt_str = amt_match.group(1).replace(",", "")
                            amt_found = float(clean_amt_str)
                            extracted_fields.append(
                                ExtractedField(
                                    case_id=artifact.case_id,
                                    artifact_id=artifact.artifact_id,
                                    field_name="amount",
                                    parser_name=parser_name,
                                    source_filename=artifact.filename,
                                    source_location=f"line:{idx}",
                                    raw_source_value=amt_match.group(0),
                                    normalized_value=amt_found,
                                    extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                                )
                            )
                        except (ValueError, TypeError):
                            pass

                    vpa_match = re.search(r"\b([a-zA-Z0-9\.\-_]{3,}@[a-zA-Z]{3,})\b", msg_body)
                    if vpa_match:
                        raw_vpa = vpa_match.group(1)
                        norm_v = normalize_vpa(raw_vpa)
                        if norm_v:
                            identifiers["vpa"] = norm_v
                            extracted_fields.append(
                                ExtractedField(
                                    case_id=artifact.case_id,
                                    artifact_id=artifact.artifact_id,
                                    field_name="vpa",
                                    parser_name=parser_name,
                                    source_filename=artifact.filename,
                                    source_location=f"line:{idx}",
                                    raw_source_value=raw_vpa,
                                    normalized_value=norm_v,
                                    extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                                )
                            )

                    ref_match = re.search(
                        r"(?:ref|rrn|invoice|inv)(?:\s+(?:is|no|num|number|id))?[\s\:\#\-\=]+([a-zA-Z0-9\-_]+)",
                        msg_body,
                        re.IGNORECASE,
                    )
                    if not ref_match:
                        ref_match = re.search(r"\b(202\d{9}|\d{12})\b", msg_body)

                    if ref_match:
                        raw_ref = ref_match.group(1)
                        norm_r = normalize_txn_ref(raw_ref)

                        if norm_r:
                            identifiers["rrn"] = norm_r
                            extracted_fields.append(
                                ExtractedField(
                                    case_id=artifact.case_id,
                                    artifact_id=artifact.artifact_id,
                                    field_name="txn_ref",
                                    parser_name=parser_name,
                                    source_filename=artifact.filename,
                                    source_location=f"line:{idx}",
                                    raw_source_value=raw_ref,
                                    normalized_value=norm_r,
                                    extraction_status=ExtractionStatus.MACHINE_EXTRACTED,
                                )
                            )

                    # Determine if this message is a payment request
                    is_pay_req = bool(amt_found and (vpa_match or "pay" in msg_body.lower() or "transfer" in msg_body.lower()))
                    if is_pay_req:
                        inferred_attrs["is_payment_request"] = True
                        rationale = "Message contains explicit financial transfer request with monetary amount."
                        has_inf = True

                    dna = EvidenceDNA(
                        evidence_id=f"DNA-{artifact.artifact_id}-{idx:03d}",
                        artifact_id=artifact.artifact_id,
                        case_id=artifact.case_id,
                        record_index=idx,
                        kind=FactKind.UPI_PAYMENT if is_pay_req else FactKind.WA_MESSAGE,
                        source_raw_text=clean,
                        source_line_ref=f"line:{idx}",
                        event_timestamp_iso=dt_raw,
                        source_entity=norm_sender_phone or sender_raw,
                        amount=amt_found,
                        auth_track=AuthType.ACTIVE,
                        trust_tier=artifact.source_tier,
                        parser_name=parser_name,
                        extracted_fields=extracted_fields,
                        identifiers=identifiers,
                        inferred_attributes=inferred_attrs,
                        inference_rationale=rationale,
                        has_inferences=has_inf,
                    )
                    dna_list.append(dna)
                else:
                    dna = EvidenceDNA(
                        evidence_id=f"DNA-{artifact.artifact_id}-{idx:03d}",
                        artifact_id=artifact.artifact_id,
                        case_id=artifact.case_id,
                        record_index=idx,
                        kind=FactKind.CLAIM,
                        source_raw_text=clean,
                        source_line_ref=f"line:{idx}",
                        auth_track=AuthType.ACTIVE,
                        trust_tier=artifact.source_tier,
                        parser_name=parser_name,
                        has_inferences=False,
                    )
                    dna_list.append(dna)
            return dna_list

        # Fallback generic container
        dna = EvidenceDNA(
            evidence_id=f"DNA-{artifact.artifact_id}-001",
            artifact_id=artifact.artifact_id,
            case_id=artifact.case_id,
            record_index=1,
            kind=FactKind.CLAIM,
            source_raw_text=raw_lines[0] if raw_lines else artifact.filename,
            source_line_ref="line:1",
            auth_track=AuthType.PASSIVE,
            trust_tier=artifact.source_tier,
        )
        dna_list.append(dna)
        return dna_list

    def update_evidence_review(
        self,
        case_id: str,
        evidence_id: str,
        review_status: str,
        reviewed_by: Optional[str] = None,
        review_notes: Optional[str] = None,
        field_overrides: Optional[Dict[str, Any]] = None,
    ) -> Optional[EvidenceDNA]:
        clean_case_id = self._sanitize(case_id)
        cd = self.get_case_dir(clean_case_id)
        dna_records = self.list_evidence_dna(clean_case_id)

        target_dna: Optional[EvidenceDNA] = None
        for r in dna_records:
            if r.evidence_id == evidence_id:
                r.review_status = review_status
                r.reviewed_by = reviewed_by
                r.review_notes = review_notes
                r.review_timestamp_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                if field_overrides:
                    r.field_overrides.update(field_overrides)
                target_dna = r
                break

        if not target_dna:
            return None

        with open(cd / "evidence_dna.json", "w", encoding="utf-8") as f:
            json.dump([d.model_dump(mode="json") for d in dna_records], f, indent=2)

        ledger = self.get_ledger(clean_case_id)
        ledger.append_action(
            action="UPDATE_DNA_REVIEW",
            payload_data={
                "evidence_id": evidence_id,
                "review_status": review_status,
                "reviewed_by": reviewed_by or "",
                "review_notes": review_notes or "",
            },
            fact_id=evidence_id,
        )

        return target_dna

    def list_canonical_facts(self, case_id: str) -> List[CanonicalFact]:
        """Bridges all extracted Evidence DNA records into rich CanonicalFacts, plus persisted facts."""
        clean_case_id = self._sanitize(case_id)
        cd = self.get_case_dir(clean_case_id)
        facts: List[CanonicalFact] = []

        cf_file = cd / "canonical_facts.json"
        if cf_file.exists():
            try:
                with open(cf_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                facts.extend([CanonicalFact.model_validate(item) for item in data])
            except Exception:
                pass

        dna_records = self.list_evidence_dna(clean_case_id)
        artifacts_by_id = {a.artifact_id: a for a in self.list_artifacts(clean_case_id)}

        existing_ids = {f.fact_id for f in facts}
        for dna in dna_records:
            art = artifacts_by_id.get(dna.artifact_id)
            src_name = art.filename if art else "artifact"
            src_sha = art.sha256 if art else "00" * 32
            cf = dna.to_canonical_fact(src_name, src_sha)
            if cf.fact_id not in existing_ids:
                facts.append(cf)
                existing_ids.add(cf.fact_id)
        return facts

    def save_canonical_facts(self, case_id: str, facts: List[CanonicalFact]) -> None:
        """Saves canonical facts to the case store."""
        clean_case_id = self._sanitize(case_id)
        cd = self.get_case_dir(clean_case_id)
        cf_file = cd / "canonical_facts.json"
        existing: Dict[str, CanonicalFact] = {}
        if cf_file.exists():
            try:
                with open(cf_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    c = CanonicalFact.model_validate(item)
                    existing[c.fact_id] = c
            except Exception:
                pass
        for f in facts:
            existing[f.fact_id] = f

        with open(cf_file, "w", encoding="utf-8") as out:
            json.dump([f.model_dump(mode="json") for f in existing.values()], out, indent=2)

    def get_case_entities(self, case_id: str) -> Tuple[List[EntityProfile], List[EntityMatch]]:
        """Resolves entities across case facts with deterministic matching and hard vetoes."""
        facts = self.list_canonical_facts(case_id)
        resolver = EntityResolver()

        # Build records representation for explainable matcher
        records: List[Dict[str, Any]] = []
        for f in facts:
            records.append({
                "entity_id": f.primary_entity or f.fact_id,
                "phone": f.identifiers.get("msisdn"),
                "vpa": f.identifiers.get("vpa"),
                "rrn": f.identifiers.get("rrn"),
                "account_suffix": f.identifiers.get("account_suffix"),
                "imei": f.identifiers.get("imei"),
                "name": f.identifiers.get("name") or (f.primary_entity if f.primary_entity and not f.primary_entity.startswith("+91") else None),
                "evidence_id": f.evidence_id,
                "artifact_id": f.artifact_id,
            })

        return resolver.match_entities_explainable(records)

    def get_case_correlations(self, case_id: str) -> Tuple[List[EventCorrelation], List[EvidenceGap]]:
        """Executes explainable correlation engine across all canonical facts."""
        facts = self.list_canonical_facts(case_id)
        engine = CorrelationEngine()
        return engine.correlate_case(facts)

    def get_case_analysis(self, case_id: str) -> Dict[str, Any]:
        """Generates timeline-ready case analysis report."""
        clean_case_id = self._sanitize(case_id)
        facts = self.list_canonical_facts(clean_case_id)
        entities, entity_matches = self.get_case_entities(clean_case_id)
        correlations, gaps = self.get_case_correlations(clean_case_id)

        contradictions = [c for c in correlations if c.is_contradiction]
        evidence_gaps = [c for c in correlations if c.is_evidence_gap]
        rejected_corrs = [c for c in correlations if c.status.value == "REJECTED"]
        review_required = [
            c for c in correlations
            if c.examiner_review_state == "REVIEW_REQUIRED" or c.status.value == "REVIEW_REQUIRED"
        ]

        return {
            "case_id": clean_case_id,
            "facts": [f.model_dump(mode="json") for f in facts],
            "proposed_entities": [e.model_dump(mode="json") for e in entities],
            "entity_links": [m.model_dump(mode="json") for m in entity_matches],
            "event_links": [c.model_dump(mode="json") for c in correlations],
            "contradictions": [c.model_dump(mode="json") for c in contradictions],
            "evidence_gaps": [c.model_dump(mode="json") for c in evidence_gaps],
            "rejected_correlations": [c.model_dump(mode="json") for c in rejected_corrs],
            "review_required_correlations": [c.model_dump(mode="json") for c in review_required],
            "integrity_limitation": INTEGRITY_LIMITATION_DISCLOSURE,
        }

    def verify_case_integrity(self, case_id: str) -> Dict[str, Any]:
        clean_case_id = self._sanitize(case_id)
        artifacts = self.list_artifacts(clean_case_id)
        ledger = self.get_ledger(clean_case_id)
        ledger_report = ledger.verify_chain()

        artifact_results = []
        all_intact = True

        for art in artifacts:
            stored_path = self.get_case_dir(clean_case_id) / art.storage_path
            if not stored_path.exists():
                artifact_results.append({
                    "artifact_id": art.artifact_id,
                    "filename": art.filename,
                    "expected_sha256": art.sha256,
                    "status": "FILE_MISSING",
                    "intact": False,
                })
                all_intact = False
                continue

            with open(stored_path, "rb") as f:
                actual_hash = hashlib.sha256(f.read()).hexdigest()

            is_match = (actual_hash == art.sha256)
            if not is_match:
                all_intact = False

            artifact_results.append({
                "artifact_id": art.artifact_id,
                "filename": art.filename,
                "expected_sha256": art.sha256,
                "calculated_sha256": actual_hash,
                "status": "INTACT" if is_match else "HASH_MISMATCH",
                "intact": is_match,
            })

        return {
            "case_id": clean_case_id,
            "overall_integrity_intact": all_intact and ledger_report.is_valid,
            "total_artifacts_verified": len(artifacts),
            "custody_ledger_valid": ledger_report.is_valid,
            "custody_total_entries": ledger_report.total_entries,
            "artifacts": artifact_results,
            "integrity_limitation": INTEGRITY_LIMITATION_DISCLOSURE,
        }

    # =========================================================================
    # Phase 3A: Analysis Runs & Counterfactual Forensics
    # =========================================================================

    def get_analysis_runs_dir(self, case_id: str) -> Path:
        """Returns the isolated analysis_runs directory for a given case."""
        clean_id = self._sanitize(case_id)
        rd = self.get_case_dir(clean_id) / "analysis_runs"
        rd.mkdir(parents=True, exist_ok=True)
        return rd

    def save_analysis_run(self, case_id: str, run: AnalysisRun) -> None:
        """Saves an analysis run to the case's versioned store."""
        run_dir = self.get_analysis_runs_dir(case_id)
        run_path = run_dir / f"{run.run_id}.json"
        with open(run_path, "w", encoding="utf-8") as f:
            json.dump(run.model_dump(mode="json"), f, indent=2)

    def get_analysis_run(self, case_id: str, run_id: str) -> Optional[AnalysisRun]:
        """Retrieves a specific analysis run by ID."""
        run_dir = self.get_analysis_runs_dir(case_id)
        run_path = run_dir / f"{run_id}.json"
        if not run_path.exists():
            return None
        with open(run_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return AnalysisRun(**data)

    def list_analysis_runs(self, case_id: str) -> List[AnalysisRun]:
        """Lists all analysis runs for a case, newest first."""
        run_dir = self.get_analysis_runs_dir(case_id)
        runs: List[AnalysisRun] = []
        for p in sorted(run_dir.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    runs.append(AnalysisRun(**json.load(f)))
            except Exception:
                pass
        return runs

    def get_or_create_baseline_run(self, case_id: str) -> AnalysisRun:
        """Returns existing baseline analysis run or deterministically creates one."""
        clean_id = self._sanitize(case_id)
        runs = self.list_analysis_runs(clean_id)
        for r in runs:
            if r.run_type == "BASELINE" and not r.excluded_artifact_ids:
                return r

        engine = CounterfactualEngine()
        all_facts = self.list_canonical_facts(clean_id)
        artifacts = self.list_artifacts(clean_id)
        hashes = {a.artifact_id: a.sha256 for a in artifacts}
        base_run = engine.execute_run(
            case_id=clean_id,
            all_facts=all_facts,
            all_artifact_hashes=hashes,
            excluded_artifact_ids=[],
            run_id=f"run_base_{clean_id[:8]}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}",
        )
        self.save_analysis_run(clean_id, base_run)
        return base_run

    def challenge_analysis_run(
        self,
        case_id: str,
        baseline_run_id: str,
        excluded_artifact_ids: List[str],
        investigator_note: Optional[str] = None,
    ) -> Tuple[AnalysisRun, RunComparison]:
        """Executes a counterfactual challenge run excluding selected artifacts."""
        clean_id = self._sanitize(case_id)
        baseline = self.get_analysis_run(clean_id, baseline_run_id)
        if not baseline:
            baseline = self.get_or_create_baseline_run(clean_id)

        engine = CounterfactualEngine()
        all_facts = self.list_canonical_facts(clean_id)
        artifacts = self.list_artifacts(clean_id)
        hashes = {a.artifact_id: a.sha256 for a in artifacts}

        chlg_run = engine.execute_run(
            case_id=clean_id,
            all_facts=all_facts,
            all_artifact_hashes=hashes,
            excluded_artifact_ids=excluded_artifact_ids,
            baseline_run_id=baseline.run_id,
            challenge_reason=investigator_note,
        )
        self.save_analysis_run(clean_id, chlg_run)
        comparison = engine.compare_runs(baseline, chlg_run)
        return chlg_run, comparison

    def compare_analysis_runs(
        self,
        case_id: str,
        baseline_run_id: str,
        challenge_run_id: str,
    ) -> RunComparison:
        """Compares a challenge run against its baseline run."""
        clean_id = self._sanitize(case_id)
        baseline = self.get_analysis_run(clean_id, baseline_run_id)
        if not baseline:
            raise ValueError(f"Baseline run '{baseline_run_id}' not found.")
        challenge = self.get_analysis_run(clean_id, challenge_run_id)
        if not challenge:
            raise ValueError(f"Challenge run '{challenge_run_id}' not found.")

        engine = CounterfactualEngine()
        return engine.compare_runs(baseline, challenge)

    def get_finding_reviews(self, case_id: str) -> Dict[str, Dict[str, Any]]:
        """Retrieves examiner reviews for contradiction findings."""
        clean_case_id = self._sanitize(case_id)
        reviews_file = self.get_case_dir(clean_case_id) / "reviews" / "finding_reviews.json"
        if not reviews_file.exists():
            return {}
        try:
            with open(reviews_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_finding_review(
        self,
        case_id: str,
        finding_id: str,
        decision: str,
        review_notes: Optional[str] = None,
        reviewed_by: str = "Forensic Examiner",
    ) -> Dict[str, Any]:
        """Saves examiner review of a contradiction finding and records custody action."""
        clean_case_id = self._sanitize(case_id)
        reviews_dir = self.get_case_dir(clean_case_id) / "reviews"
        reviews_dir.mkdir(parents=True, exist_ok=True)
        reviews = self.get_finding_reviews(clean_case_id)
        now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        review_record = {
            "finding_id": finding_id,
            "decision": decision,
            "review_notes": review_notes or "",
            "reviewed_by": reviewed_by,
            "reviewed_at_iso": now_iso,
        }
        reviews[finding_id] = review_record
        reviews_file = reviews_dir / "finding_reviews.json"
        with open(reviews_file, "w", encoding="utf-8") as f:
            json.dump(reviews, f, indent=2)

        ledger = self.get_ledger(clean_case_id)
        ledger.append_action(
            action="REVIEW_CONTRADICTION",
            payload_data=review_record,
            fact_id=finding_id,
        )
        return review_record

    def get_gap_reviews(self, case_id: str) -> Dict[str, Dict[str, Any]]:
        """Retrieves examiner reviews for evidence gaps."""
        clean_case_id = self._sanitize(case_id)
        reviews_file = self.get_case_dir(clean_case_id) / "reviews" / "gap_reviews.json"
        if not reviews_file.exists():
            return {}
        try:
            with open(reviews_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_gap_review(
        self,
        case_id: str,
        gap_id: str,
        decision: str,
        review_notes: Optional[str] = None,
        reviewed_by: str = "Forensic Examiner",
        review_scope: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Saves examiner review of an evidence gap and records custody action."""
        clean_case_id = self._sanitize(case_id)
        reviews_dir = self.get_case_dir(clean_case_id) / "reviews"
        reviews_dir.mkdir(parents=True, exist_ok=True)
        reviews = self.get_gap_reviews(clean_case_id)
        now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        review_record = {
            "gap_id": gap_id,
            "decision": decision,
            "review_notes": review_notes or "",
            "reviewed_by": reviewed_by,
            "review_scope": review_scope,
            "reviewed_at_iso": now_iso,
        }
        reviews[gap_id] = review_record
        reviews_file = reviews_dir / "gap_reviews.json"
        with open(reviews_file, "w", encoding="utf-8") as f:
            json.dump(reviews, f, indent=2)

        ledger = self.get_ledger(clean_case_id)
        ledger.append_action(
            action="REVIEW_EVIDENCE_GAP",
            payload_data=review_record,
            fact_id=gap_id,
        )
        return review_record

    def save_report(self, case_id: str, report: Any) -> None:
        """Saves a forensic report to the case's reports repository."""
        clean_case_id = self._sanitize(case_id)
        cd = self.get_case_dir(clean_case_id)
        reports_dir = cd / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        report_data = report.model_dump(mode="json") if hasattr(report, "model_dump") else report
        report_id = report_data.get("metadata", {}).get("report_id") or report_data.get("report_id")
        if not report_id:
            raise ValueError("Report must contain a valid metadata.report_id.")
        clean_rep_id = self._sanitize(report_id)
        with open(reports_dir / f"{clean_rep_id}.json", "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

    def get_report(self, case_id: str, report_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a forensic report from the case's reports repository."""
        clean_case_id = self._sanitize(case_id)
        clean_rep_id = self._sanitize(report_id)
        reports_dir = self.get_case_dir(clean_case_id) / "reports"
        rep_file = reports_dir / f"{clean_rep_id}.json"
        if not rep_file.exists():
            return None
        try:
            with open(rep_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            raise ValueError(f"Corrupted or invalid report file '{clean_rep_id}.json': {exc}")

    def list_reports(self, case_id: str) -> List[Dict[str, Any]]:
        """Lists all forensic reports saved for a case."""
        clean_case_id = self._sanitize(case_id)
        reports_dir = self.get_case_dir(clean_case_id) / "reports"
        if not reports_dir.exists():
            return []
        reports = []
        for f in reports_dir.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    reports.append(data)
            except Exception:
                continue
        # Sort by generated_at_iso descending
        reports.sort(
            key=lambda r: r.get("metadata", {}).get("generated_at_iso", ""),
            reverse=True,
        )
        return reports
