"""Declarative Rule Registry for TARKA Forensic Evidence Correlation.

Strict Requirements:
1. Validated declarative Pydantic schemas.
2. Only fixed safe operators:
   - exact_match
   - not_equal
   - within_time_window
   - before
   - after
   - exists
   - missing
3. Strictly NO arbitrary Python execution, user-entered expressions, dynamic evaluation, or unsafe rule code.
4. Preserves all existing TARKA rule IDs, outputs, versions, and test expectations.
"""

from __future__ import annotations

import json
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SafeOperator(str, Enum):
    """Allowed safe correlation and contradiction operators.
    
    No arbitrary code execution, dynamic eval, or lambdas allowed.
    """
    EXACT_MATCH = "exact_match"
    NOT_EQUAL = "not_equal"
    WITHIN_TIME_WINDOW = "within_time_window"
    BEFORE = "before"
    AFTER = "after"
    EXISTS = "exists"
    MISSING = "missing"


class DeclarativeRule(BaseModel):
    """Validated declarative correlation and contradiction rule definition."""
    rule_id: str = Field(description="Deterministic rule identifier (e.g. RULE_TXN_REF_EXACT)")
    version: str = Field(default="1.0.0", description="Semver rule version string")
    display_name: str = Field(description="Human-readable title of the rule")
    purpose: str = Field(description="Forensic objective and scope of the rule")
    input_fact_types: List[str] = Field(description="Fact kind strings accepted by this rule")
    join_key: str = Field(description="Semantic key used to correlate records (e.g. rrn, vpa, msisdn, amount)")
    field_paths: List[str] = Field(description="Dot-notated paths of compared fields in facts")
    operator: SafeOperator = Field(description="Strictly validated safe operator")
    output_type: str = Field(default="CORRELATION", description="Output type: CORRELATION, CONTRADICTION, EVIDENCE_GAP, or FINDING")
    review_required: bool = Field(default=False, description="True if correlation requires human examiner review")
    time_window: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Temporal criteria constraints (e.g. max_delta_seconds, window_seconds)",
    )
    rationale_template: str = Field(description="Deterministic template string explaining rule evaluation")

    @field_validator("operator", mode="before")
    def validate_operator(cls, v: Any) -> SafeOperator:
        """Enforces that operator belongs strictly to the whitelisted SafeOperator enum."""
        if isinstance(v, SafeOperator):
            return v
        if isinstance(v, str):
            for op in SafeOperator:
                if op.value == v or op.name == v:
                    return op
        allowed = [op.value for op in SafeOperator]
        raise ValueError(
            f"Unsupported or unsafe operator '{v}'. Operator must strictly be one of: {', '.join(allowed)}. "
            "Arbitrary execution or dynamic evaluation is prohibited."
        )


class DeclarativeRuleRegistry:
    """Registry maintaining all validated declarative TARKA correlation rules."""

    def __init__(self) -> None:
        self._rules: Dict[str, DeclarativeRule] = {}
        self._register_default_rules()

    def register_rule(self, rule: DeclarativeRule) -> None:
        """Registers a declarative rule, validating schema and operator."""
        self._rules[rule.rule_id] = rule

    def get_rule(self, rule_id: str) -> Optional[DeclarativeRule]:
        """Retrieves a rule by ID."""
        return self._rules.get(rule_id)

    def list_rules(self) -> List[DeclarativeRule]:
        """Returns all registered declarative rules sorted by rule_id."""
        return sorted(self._rules.values(), key=lambda r: r.rule_id)

    def to_dict_list(self) -> List[Dict[str, Any]]:
        """Returns JSON-serializable list of declarative rules."""
        return [r.model_dump() for r in self.list_rules()]

    def to_json(self, indent: int = 2) -> str:
        """Exports registry to formatted JSON."""
        return json.dumps(self.to_dict_list(), indent=indent)

    def _register_default_rules(self) -> None:
        """Populates the 9 migrated TARKA correlation rules + direct observation rule."""
        rules = [
            DeclarativeRule(
                rule_id="RULE_TXN_REF_EXACT",
                version="1.0.0",
                display_name="Exact Transaction Reference Match",
                purpose="Correlates events sharing an identical transaction reference (RRN / Txn ID) across independent evidence sources.",
                input_fact_types=["chat_message", "payment_request", "bank_transaction", "media_metadata", "extracted_identifier"],
                join_key="rrn",
                field_paths=["identifiers.rrn", "identifiers.rrn"],
                operator=SafeOperator.EXACT_MATCH,
                output_type="CORRELATION",
                review_required=False,
                time_window=None,
                rationale_template="Exact transaction reference match (RRN: {join_val}) connects {f1_kind} ({f1_source}) with {f2_kind} ({f2_source}).",
            ),
            DeclarativeRule(
                rule_id="RULE_VPA_EXACT",
                version="1.0.0",
                display_name="Exact UPI VPA Match",
                purpose="Correlates payment requests in chat with bank transactions using identical Virtual Payment Addresses.",
                input_fact_types=["chat_message", "payment_request", "bank_transaction"],
                join_key="vpa",
                field_paths=["identifiers.vpa", "identifiers.vpa"],
                operator=SafeOperator.EXACT_MATCH,
                output_type="CORRELATION",
                review_required=False,
                time_window=None,
                rationale_template="Identical UPI Virtual Payment Address ({join_val}) requested in chat matches recipient payee VPA in bank debit record.",
            ),
            DeclarativeRule(
                rule_id="RULE_PHONE_EXACT",
                version="1.0.0",
                display_name="Exact Phone Number Cross-Source Link",
                purpose="Connects cellular call records with chat or banking records using normalized MSISDN.",
                input_fact_types=["cdr_call", "chat_message", "payment_request", "bank_transaction"],
                join_key="msisdn",
                field_paths=["identifiers.msisdn", "identifiers.msisdn"],
                operator=SafeOperator.EXACT_MATCH,
                output_type="CORRELATION",
                review_required=False,
                time_window=None,
                rationale_template="Normalized phone number ({join_val}) connects cellular CDR call record with {other_kind} in {other_source}.",
            ),
            DeclarativeRule(
                rule_id="RULE_PAYMENT_FLOW_CAUSAL",
                version="1.0.0",
                display_name="Causal Chat Payment Request Flow",
                purpose="Identifies payment requests in chat that precede a corresponding bank debit transaction within an allowed temporal window.",
                input_fact_types=["payment_request", "bank_transaction"],
                join_key="amount_or_vpa",
                field_paths=["time_provenance.utc_epoch", "time_provenance.utc_epoch"],
                operator=SafeOperator.BEFORE,
                output_type="CORRELATION",
                review_required=False,
                time_window={"max_delta_seconds": 3600.0},
                rationale_template="Payment request in chat occurred {delta:.0f} seconds prior to corresponding bank debit transaction (Amount: ₹{amount:,.2f} if applicable), consistent with requested transfer.",
            ),
            DeclarativeRule(
                rule_id="RULE_AMOUNT_WINDOW",
                version="1.0.0",
                display_name="Identical Amount in Temporal Window",
                purpose="Identifies matching financial amounts occurring within a configurable temporal window across different evidence sources.",
                input_fact_types=["chat_message", "payment_request", "bank_transaction"],
                join_key="amount",
                field_paths=["amount", "amount"],
                operator=SafeOperator.WITHIN_TIME_WINDOW,
                output_type="CORRELATION",
                review_required=False,
                time_window={"max_delta_seconds": 1800.0},
                rationale_template="Identical financial amount (₹{amount:,.2f}) observed within {delta:.0f} seconds across chat request and bank transaction.",
            ),
            DeclarativeRule(
                rule_id="RULE_CALL_PROXIMITY",
                version="1.0.0",
                display_name="Cellular Voice Call Near Communication/Transaction",
                purpose="Correlates voice calls with payment requests or transactions involving the same phone party within temporal proximity.",
                input_fact_types=["cdr_call", "chat_message", "payment_request", "bank_transaction"],
                join_key="msisdn",
                field_paths=["time_provenance.utc_epoch", "time_provenance.utc_epoch"],
                operator=SafeOperator.WITHIN_TIME_WINDOW,
                output_type="CORRELATION",
                review_required=False,
                time_window={"max_delta_seconds": 1800.0},
                rationale_template="Cellular call involving {phone} occurred {delta:.0f} seconds near {ev_kind} ({ev_source}).",
            ),
            DeclarativeRule(
                rule_id="RULE_MEDIA_TXN_MISMATCH",
                version="1.0.0",
                display_name="Claimed Media Amount Conflict",
                purpose="Identifies factual contradictions where a screenshot or media claim amount conflicts with official banking records for the same RRN.",
                input_fact_types=["media_metadata", "bank_transaction"],
                join_key="rrn",
                field_paths=["amount", "amount"],
                operator=SafeOperator.NOT_EQUAL,
                output_type="CONTRADICTION",
                review_required=True,
                time_window=None,
                rationale_template="Factual contradiction: Screenshot/claim indicates amount ₹{claimed_amt:,.2f}, whereas bank transaction RRN {rrn} records ₹{bank_amt:,.2f}. Discrepancy delta = ₹{delta:,.2f}.",
            ),
            DeclarativeRule(
                rule_id="RULE_MEDIA_TXN_MATCH",
                version="1.0.0",
                display_name="Corroborated Media Claim and Bank Record",
                purpose="Identifies corroboration where screenshot amount and RRN match official bank transaction records.",
                input_fact_types=["media_metadata", "bank_transaction"],
                join_key="rrn",
                field_paths=["amount", "amount"],
                operator=SafeOperator.EXACT_MATCH,
                output_type="CORRELATION",
                review_required=False,
                time_window=None,
                rationale_template="Screenshot claim amount (₹{claimed_amt:,.2f}) and RRN ({rrn}) are fully corroborated by bank transaction record.",
            ),
            DeclarativeRule(
                rule_id="RULE_EVIDENCE_GAP_MISSING_TXN",
                version="1.0.0",
                display_name="Uncorroborated Payment Claim",
                purpose="Identifies evidence gaps where an unverified payment claim or receipt asserts a transaction that has no corresponding bank entry.",
                input_fact_types=["media_metadata", "extracted_identifier"],
                join_key="rrn",
                field_paths=["identifiers.rrn"],
                operator=SafeOperator.MISSING,
                output_type="EVIDENCE_GAP",
                review_required=True,
                time_window=None,
                rationale_template="Evidence gap: Media claim asserts payment of ₹{claimed_amt:,.2f} (RRN: {rrn}) to {vpa}, but no matching transaction entry exists in the supplied bank statements.",
            ),
            DeclarativeRule(
                rule_id="SUPPLIED_BANK_STATEMENT_RECORD",
                version="1.0.0",
                display_name="Supplied Bank-Statement Record Observation",
                purpose="Direct observation of official debit transaction recorded in supplied bank-statement evidence.",
                input_fact_types=["bank_transaction"],
                join_key="rrn",
                field_paths=["identifiers.rrn", "amount"],
                operator=SafeOperator.EXISTS,
                output_type="FINDING",
                review_required=False,
                time_window=None,
                rationale_template="The supplied bank-statement record records a debit with RRN {rrn} and amount ₹{amount:,.2f}.",
            ),
            DeclarativeRule(
                rule_id="RULE_CONTRA_AMOUNT_DISCREPANCY",
                version="1.0.0",
                display_name="Financial Amount Discrepancy under Shared Reference",
                purpose="Identifies conflicting transaction amounts sharing an identical RRN across independent evidence sources.",
                input_fact_types=["bank_transaction", "media_metadata", "payment_request", "chat_message"],
                join_key="rrn",
                field_paths=["amount", "amount"],
                operator=SafeOperator.NOT_EQUAL,
                output_type="CONTRADICTION",
                review_required=True,
                time_window=None,
                rationale_template="Factual contradiction: Source records report differing amounts for transaction reference RRN {rrn}.",
            ),
            DeclarativeRule(
                rule_id="RULE_CONTRA_STATUS_CONFLICT",
                version="1.0.0",
                display_name="Conflicting Transaction Status",
                purpose="Identifies contradictory payment completion or settlement states for the same transaction reference.",
                input_fact_types=["bank_transaction", "media_metadata"],
                join_key="rrn",
                field_paths=["identifiers.status", "identifiers.status"],
                operator=SafeOperator.NOT_EQUAL,
                output_type="CONTRADICTION",
                review_required=True,
                time_window=None,
                rationale_template="Factual contradiction: One source asserts SUCCESS while another records failure/rejection for RRN {rrn}.",
            ),
            DeclarativeRule(
                rule_id="RULE_CONTRA_TIMESTAMP_CONFLICT",
                version="1.0.0",
                display_name="Causal Sequence Inversion / Temporal Conflict",
                purpose="Identifies impossible temporal sequences such as payment completion before payment initiation under a shared reference.",
                input_fact_types=["bank_transaction", "payment_request", "chat_message"],
                join_key="rrn",
                field_paths=["time_provenance.utc_epoch", "time_provenance.utc_epoch"],
                operator=SafeOperator.BEFORE,
                output_type="CONTRADICTION",
                review_required=True,
                time_window=None,
                rationale_template="Temporal conflict: Completion record timestamp precedes request timestamp for RRN {rrn}.",
            ),
            DeclarativeRule(
                rule_id="RULE_CONTRA_IDENTIFIER_CONFLICT",
                version="1.0.0",
                display_name="Conflicting Counterparty Identifier",
                purpose="Identifies conflicting payee VPAs, phone numbers, or account suffixes under a shared transaction reference.",
                input_fact_types=["bank_transaction", "payment_request", "media_metadata"],
                join_key="rrn",
                field_paths=["identifiers.vpa", "identifiers.vpa"],
                operator=SafeOperator.NOT_EQUAL,
                output_type="CONTRADICTION",
                review_required=True,
                time_window=None,
                rationale_template="Identifier conflict: Sources report differing payee VPAs under transaction reference RRN {rrn}.",
            ),
            DeclarativeRule(
                rule_id="RULE_GAP_UNAVAILABLE_RRN",
                version="1.0.0",
                display_name="Unavailable Transaction Reference",
                purpose="Exposes transactions lacking a verifiable RRN or UTR, preventing deterministic cross-source linkage.",
                input_fact_types=["bank_transaction"],
                join_key="rrn",
                field_paths=["identifiers.rrn"],
                operator=SafeOperator.MISSING,
                output_type="EVIDENCE_GAP",
                review_required=False,
                time_window=None,
                rationale_template="Evidence gap: Transaction entry lacks an explicit RRN/UTR identifier.",
            ),
            DeclarativeRule(
                rule_id="RULE_GAP_INFERRED_TIMESTAMP",
                version="1.0.0",
                display_name="Inferred Event Timestamp",
                purpose="Flags timeline events relying on inferred contextual constraints rather than explicit file clock provenance.",
                input_fact_types=["event"],
                join_key="timestamp",
                field_paths=["time_provenance.utc_epoch"],
                operator=SafeOperator.MISSING,
                output_type="EVIDENCE_GAP",
                review_required=True,
                time_window=None,
                rationale_template="Evidence gap: Chronological ordering of event relies on inferred timestamp without verified clock authority.",
            ),
            DeclarativeRule(
                rule_id="RULE_GAP_UNPROCESSED_PAGES",
                version="1.0.0",
                display_name="Unprocessed Document Pages",
                purpose="Exposes multi-page document artifacts where one or more pages failed processing or were skipped.",
                input_fact_types=["artifact"],
                join_key="coverage",
                field_paths=["metadata.coverage.failed_pages"],
                operator=SafeOperator.NOT_EQUAL,
                output_type="EVIDENCE_GAP",
                review_required=True,
                time_window=None,
                rationale_template="Evidence gap: Multi-page document contains unexamined or failed pages, compromising completeness.",
            ),
            DeclarativeRule(
                rule_id="RULE_GAP_UNRESOLVED_OCR",
                version="1.0.0",
                display_name="Unresolved OCR Extraction Ambiguity",
                purpose="Flags critical visual fields requiring human review or marked unreadable.",
                input_fact_types=["extracted_field"],
                join_key="review_status",
                field_paths=["extracted_fields.extraction_status"],
                operator=SafeOperator.NOT_EQUAL,
                output_type="EVIDENCE_GAP",
                review_required=True,
                time_window=None,
                rationale_template="Evidence gap: Visual field extraction confidence is below admissibility threshold.",
            ),
            DeclarativeRule(
                rule_id="RULE_GAP_MISSING_SOURCE_CATEGORY",
                version="1.0.0",
                display_name="Missing Core Evidentiary Category",
                purpose="Identifies cases where essential evidentiary categories (such as bank statements) were never supplied.",
                input_fact_types=["artifact"],
                join_key="source_tier",
                field_paths=["source_tier"],
                operator=SafeOperator.MISSING,
                output_type="EVIDENCE_GAP",
                review_required=True,
                time_window=None,
                rationale_template="Evidence gap: Essential evidentiary source category has not been provided to the case repository.",
            ),
            # Phase 5D: Investigation Prioritization Rules
            DeclarativeRule(
                rule_id="RULE_PRIORITY_CRITICAL_CONTRADICTION",
                version="1.0.0",
                display_name="Prioritize Critical Contradiction",
                purpose="Elevates investigative focus on critical-severity contradictions directly linked to transactions and entities.",
                input_fact_types=["finding"],
                join_key="finding_id",
                field_paths=["severity", "category"],
                operator=SafeOperator.EXACT_MATCH,
                output_type="INVESTIGATION_PRIORITY",
                review_required=False,
                time_window=None,
                rationale_template="Investigation priority elevated: Critical contradiction directly impacts financial integrity of referenced transaction.",
            ),
            DeclarativeRule(
                rule_id="RULE_PRIORITY_EVIDENCE_GAP",
                version="1.0.0",
                display_name="Prioritize Impactful Evidence Gap",
                purpose="Elevates investigation of missing evidence that impacts major findings or corroboration.",
                input_fact_types=["evidence_gap"],
                join_key="gap_id",
                field_paths=["is_mandatory_for_resolution", "status"],
                operator=SafeOperator.EXACT_MATCH,
                output_type="INVESTIGATION_PRIORITY",
                review_required=False,
                time_window=None,
                rationale_template="Investigation priority elevated: Mandatory evidence gap blocks corroboration of active case claims.",
            ),
            DeclarativeRule(
                rule_id="RULE_PRIORITY_UNVERIFIED_ENTITY",
                version="1.0.0",
                display_name="Prioritize Unverified Entity Discrepancy",
                purpose="Elevates entities involved in multiple conflicting relationships or uncorroborated identifiers.",
                input_fact_types=["entity"],
                join_key="entity_id",
                field_paths=["associated_artifact_ids"],
                operator=SafeOperator.EXISTS,
                output_type="INVESTIGATION_PRIORITY",
                review_required=False,
                time_window=None,
                rationale_template="Investigation priority elevated: Entity participates in conflicting cross-source records or unverified payment endpoints.",
            ),
            DeclarativeRule(
                rule_id="RULE_PRIORITY_TIMELINE_ANOMALY",
                version="1.0.0",
                display_name="Prioritize Timeline Anomaly",
                purpose="Elevates temporal ordering conflicts, causal sequence inversions, and multi-clock transit loops.",
                input_fact_types=["timeline_event"],
                join_key="event_id",
                field_paths=["temporal_priority", "conflicting_event_ids"],
                operator=SafeOperator.EXISTS,
                output_type="INVESTIGATION_PRIORITY",
                review_required=False,
                time_window=None,
                rationale_template="Investigation priority elevated: Chronological conflict or causal inversion detected in event reconstruction.",
            ),
            DeclarativeRule(
                rule_id="RULE_PRIORITY_REVIEW_PENDING",
                version="1.0.0",
                display_name="Prioritize Pending Investigator Review",
                purpose="Elevates findings and gaps requiring mandatory human examiner review that remain unreviewed.",
                input_fact_types=["finding"],
                join_key="review_state",
                field_paths=["review_state"],
                operator=SafeOperator.EXACT_MATCH,
                output_type="INVESTIGATION_PRIORITY",
                review_required=True,
                time_window=None,
                rationale_template="Investigation priority elevated: Item requires examiner audit determination and scope verification.",
            ),
        ]
        for r in rules:
            self.register_rule(r)


# Global default rule registry singleton
DEFAULT_RULE_REGISTRY = DeclarativeRuleRegistry()
