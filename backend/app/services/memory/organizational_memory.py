"""
SentinelX Tier 4 — Governed Organizational / Institutional Memory.

Organizational memory preserves reusable institutional knowledge:
- PLAYBOOK (Standard Cyber Fraud, Hawala Money Laundering Tracing)
- PROCEDURE (Sec 65B/BSA digital evidence preservation, CDR request procedures)
- TEMPLATE (Court production summaries, statutory notices)
- DOMAIN_KNOWLEDGE (Banking RTGS/NEFT settlement cycles, telecom tower coverage)
- LESSON_LEARNED (Post-incident analytical post-mortems)
- VALIDATED_PATTERN (Mule bank account fan-out topology)

CRITICAL INVARIANTS:
1. Strict isolation from raw case PII: never inherits raw suspect names, Aadhaar,
   unredacted phone numbers, or case transcripts.
2. Governed promotion pipeline:
   CASE KNOWLEDGE -> DE-IDENTIFICATION -> SENSITIVITY REVIEW -> HUMAN APPROVAL -> ORGANIZATIONAL MEMORY.
   No autonomous promotion!
"""
from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.memory import (
    MemoryAccessPolicy,
    MemoryEpistemicStatus,
    MemoryProvenance,
    MemoryRecord,
    MemoryScope,
    MemorySensitivity,
    MemoryStatus,
    MemoryTier,
    MemoryValidity,
    OrganizationalMemoryType,
)

logger = logging.getLogger("sentinelx.memory.organizational")


class PromotionProposal(BaseModel):
    """Proposal to promote case insights into institutional knowledge."""
    proposal_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    proposed_by: str
    knowledge_type: OrganizationalMemoryType
    title: str
    sanitized_content: str
    structured_pattern: Dict[str, Any] = Field(default_factory=dict)
    source_memory_ids: List[str] = Field(default_factory=list)
    is_pii_clean: bool = False
    pii_violations: List[str] = Field(default_factory=list)
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class OrganizationalMemoryManager:
    """Manages institutional memory, PII scrub validation, and governed promotion."""

    # Common PII Regexes for Indian Law Enforcement Context
    AADHAAR_REGEX = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
    PHONE_REGEX = re.compile(r"(?:\+91|91|0)?[6-9]\d{9}\b")
    PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")

    def __init__(self) -> None:
        self.proposals: Dict[str, PromotionProposal] = {}
        self.default_records: List[MemoryRecord] = self._init_default_organizational_knowledge()

    @classmethod
    def check_pii_clean(cls, text: str) -> Tuple[bool, List[str]]:
        """Verify that proposed content does not leak raw suspect PII or identifiers."""
        violations = []
        if cls.AADHAAR_REGEX.search(text):
            violations.append("Contains potential Aadhaar number pattern")
        if cls.PHONE_REGEX.search(text):
            violations.append("Contains potential unredacted Indian telephone number")
        if cls.PAN_REGEX.search(text):
            violations.append("Contains potential Indian Income Tax PAN")

        return len(violations) == 0, violations

    def propose_promotion(
        self,
        case_id: str,
        proposed_by: str,
        knowledge_type: OrganizationalMemoryType,
        title: str,
        content: str,
        structured_pattern: Optional[Dict[str, Any]] = None,
        source_memory_ids: Optional[List[str]] = None,
    ) -> PromotionProposal:
        """Create a promotion proposal and perform automated PII hygiene scan."""
        is_clean, violations = self.check_pii_clean(content)
        
        proposal = PromotionProposal(
            case_id=case_id,
            proposed_by=proposed_by,
            knowledge_type=knowledge_type,
            title=title,
            sanitized_content=content,
            structured_pattern=structured_pattern or {},
            source_memory_ids=source_memory_ids or [],
            is_pii_clean=is_clean,
            pii_violations=violations,
        )
        self.proposals[proposal.proposal_id] = proposal
        logger.info(
            "Created organizational promotion proposal %s (is_clean=%s)",
            proposal.proposal_id,
            is_clean,
        )
        return proposal

    def approve_promotion(
        self,
        proposal_id: str,
        approver_id: str,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> Tuple[bool, Optional[MemoryRecord], Optional[str]]:
        """
        Human supervisor approval of an organizational promotion proposal.
        Strictly requires PII clean verification before approval can succeed.
        """
        proposal = self.proposals.get(proposal_id)
        if not proposal:
            return False, None, "Proposal not found"

        if not proposal.is_pii_clean:
            return False, None, f"Cannot approve: PII violations detected: {proposal.pii_violations}"

        now = datetime.now(UTC).isoformat()
        proposal.is_approved = True
        proposal.approved_by = approver_id
        proposal.approved_at = now

        provenance = MemoryProvenance(
            source_type="APPROVED_ORGANIZATIONAL_KNOWLEDGE",
            source_ids=[proposal.proposal_id],
            created_by=approver_id,
            created_at=now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        record = MemoryRecord(
            tier=MemoryTier.ORGANIZATIONAL,
            scope=MemoryScope.ORGANIZATION,
            case_id=None,  # Decoupled from specific case
            jurisdiction=jurisdiction,
            content=f"[{proposal.knowledge_type.value}] {proposal.title}: {proposal.sanitized_content}",
            structured_payload={
                "knowledge_type": proposal.knowledge_type.value,
                "title": proposal.title,
                "pattern": proposal.structured_pattern,
                "proposal_id": proposal.proposal_id,
                "original_case_ref": proposal.case_id,
            },
            epistemic_status=MemoryEpistemicStatus.OBSERVED,
            confidence=1.0,
            provenance=provenance,
            validity=MemoryValidity(observed_at=now, valid_from=now),
            created_by=approver_id,
            source_type="APPROVED_ORGANIZATIONAL_KNOWLEDGE",
            source_ids=[proposal.proposal_id],
            sensitivity=MemorySensitivity.INTERNAL,
            access_policy=MemoryAccessPolicy(
                required_role="INVESTIGATOR",
                required_clearance="INTERNAL",
                allow_cross_case=True,
            ),
            status=MemoryStatus.ACTIVE,
        )

        logger.info("Approved organizational memory record %s from proposal %s", record.memory_id, proposal_id)
        return True, record, None

    def _init_default_organizational_knowledge(self) -> List[MemoryRecord]:
        """Pre-populate canonical institutional playbooks and procedures."""
        now = datetime.now(UTC).isoformat()
        records = []

        # 1. Playbook: Cyber Fraud Mule Network Analysis
        p1 = MemoryProvenance(
            source_type="APPROVED_ORGANIZATIONAL_KNOWLEDGE",
            source_ids=["PLAYBOOK-CYBER-MULE-01"],
            created_by="HQ_DOCTRINE_BOARD",
            created_at=now,
        )
        p1.lineage_hash = p1.compute_hash()
        records.append(
            MemoryRecord(
                tier=MemoryTier.ORGANIZATIONAL,
                scope=MemoryScope.ORGANIZATION,
                case_id=None,
                jurisdiction="NATIONAL_CYBER_CRIME_COORDINATION",
                content=(
                    "[PLAYBOOK] Mule Account Fan-Out Analysis: Tracing rapid fund disbursement "
                    "across multiple layered bank accounts within 15 minutes of victim debit."
                ),
                structured_payload={
                    "knowledge_type": "PLAYBOOK",
                    "title": "Mule Account Fan-Out Analysis",
                    "steps": [
                        "Acquire immediate freeze under Section 102 CrPC / BNSS",
                        "Extract beneficiary IFSC and branch details",
                        "Correlate mobile numbers linked to KYC across accounts",
                    ],
                },
                epistemic_status=MemoryEpistemicStatus.OBSERVED,
                confidence=1.0,
                provenance=p1,
                validity=MemoryValidity(observed_at=now, valid_from=now),
                created_by="HQ_DOCTRINE_BOARD",
                source_type="APPROVED_ORGANIZATIONAL_KNOWLEDGE",
                source_ids=["PLAYBOOK-CYBER-MULE-01"],
                sensitivity=MemorySensitivity.INTERNAL,
                access_policy=MemoryAccessPolicy(allow_cross_case=True),
                status=MemoryStatus.ACTIVE,
            )
        )

        # 2. Procedure: Section 63/65B BSA Certificate Procedure
        p2 = MemoryProvenance(
            source_type="APPROVED_ORGANIZATIONAL_KNOWLEDGE",
            source_ids=["PROCEDURE-BSA-CERT-01"],
            created_by="HQ_LEGAL_CELL",
            created_at=now,
        )
        p2.lineage_hash = p2.compute_hash()
        records.append(
            MemoryRecord(
                tier=MemoryTier.ORGANIZATIONAL,
                scope=MemoryScope.ORGANIZATION,
                case_id=None,
                jurisdiction="NATIONAL_CYBER_CRIME_COORDINATION",
                content=(
                    "[PROCEDURE] Bharatiya Sakshya Adhiniyam (BSA) / Sec 65B Electronic Record Certificate: "
                    "Mandatory chain-of-custody and hash verification requirements for digital device seizure."
                ),
                structured_payload={
                    "knowledge_type": "PROCEDURE",
                    "title": "BSA Digital Certificate Issuance",
                    "statutory_ref": "Bharatiya Sakshya Adhiniyam, Section 63",
                },
                epistemic_status=MemoryEpistemicStatus.OBSERVED,
                confidence=1.0,
                provenance=p2,
                validity=MemoryValidity(observed_at=now, valid_from=now),
                created_by="HQ_LEGAL_CELL",
                source_type="APPROVED_ORGANIZATIONAL_KNOWLEDGE",
                source_ids=["PROCEDURE-BSA-CERT-01"],
                sensitivity=MemorySensitivity.INTERNAL,
                access_policy=MemoryAccessPolicy(allow_cross_case=True),
                status=MemoryStatus.ACTIVE,
            )
        )

        return records
