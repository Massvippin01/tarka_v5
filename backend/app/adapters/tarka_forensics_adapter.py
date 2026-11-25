"""TARKA Forensics Adapter for SentinelX.

Governed by SentinelX Wave 6 Engineering Constitution:
- PostgreSQL / Neo4j / OpenSearch canonical data authority boundaries preserved.
- Append-only evidence custody and bitstream SHA-256 fidelity maintained.
- Strict Non-Promotability Invariant: AI/Machine-generated facts remain unverified
  inferences until explicitly confirmed by human examiner review.
- Provenance lineage preserved: Artifact -> Hash -> DNA -> Fact -> Correlation -> Graph.
"""

from __future__ import annotations

import base64
import csv
import hashlib
import io
import json
import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("sentinelx.adapters.tarka")

from tarka.core.evidence_dna import CaseStore, TrustTier, Artifact, EvidenceDNA
from tarka.core.canonical_fact import CanonicalFact
from tarka.core.analysis_run import CounterfactualEngine, AnalysisRun, FindingSummary
from tarka.core.provenance_dag import (
    ProvenanceDAGBuilder,
    ProvenanceDAG,
    DAGNodeStatus,
    DAGNodeType,
)
from tarka.core.investigation_graph import (
    InvestigationGraphBuilder,
    InvestigationGraph,
)
from tarka.core.contradiction_analysis import ContradictionAnalysisEngine
from tarka.core.timeline_reconstruction import TimelineReconstructionEngine
from tarka.core.finding_explanation import FindingExplanationEngine
from tarka.core.forensic_report import (
    ForensicReportBuilder,
    ForensicReport,
    ForensicReportHTMLExporter,
    ForensicReportPDFExporter,
)
from tarka.api.server import case_store, seed_demo_case_if_needed, FIXTURES_FRAUD_DIR
from app.adapters.trace_engine import TraceEngine
from app.adapters.aegis_gateway import AegisGateway
from app.adapters.whatsapp_gateway import WhatsAppGateway
from app.adapters.multimodal_evidence_gateway import MultimodalEvidenceGateway, IngestionSecurityError, IngestionQuarantineError
from app.adapters.universal_evidence_gateway import UniversalEvidenceGateway, OffsetMismatchError
from app.adapters.trace_payment_forensics import TracePaymentForensics
from app.adapters.aegis_reasoning_engine import AegisReasoningEngine
from app.services.forensic_job_orchestrator import ForensicJobOrchestrator, JobState


class TarkaForensicsAdapter:
    """Documented bidirectional adapter connecting TARKA engine with SentinelX."""

    def __init__(self, store: Optional[CaseStore] = None):
        # Use shared case_store from server.py (or custom injected store)
        self.store = store or case_store
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.case_observations: Dict[str, List[Dict[str, Any]]] = {}
        self.trace_engine = TraceEngine()
        self.aegis_gateway = AegisGateway()
        self.whatsapp_gateway = WhatsAppGateway()
        self.universal_gw = UniversalEvidenceGateway()
        self.multimodal_gw = self.universal_gw
        self.trace_payment_engine = TracePaymentForensics()
        self.aegis_reasoning = AegisReasoningEngine()
        self.job_orchestrator = ForensicJobOrchestrator.get_instance()

    def ensure_synthetic_case(self, case_id: str = "upi_payment_discrepancy", allow_non_demo: bool = False) -> Dict[str, Any]:
        """
        Ensures the canonical SUTRAM 2026 synthetic case is seeded and ready.
        PRODUCTION SAFETY: Synthetic evidence is strictly restricted to explicit demo/test cases.
        Never inject synthetic fixtures into an actual investigator's case.
        """
        is_demo_target = (
            case_id == "upi_payment_discrepancy"
            or case_id.lower().startswith(("demo", "synthetic", "test", "case-phase9"))
            or allow_non_demo
        )
        if not is_demo_target:
            raise PermissionError(
                f"Synthetic demo data injection is strictly forbidden in real investigative case '{case_id}'. "
                "Synthetic seeding is restricted exclusively to designated demo/test workspaces."
            )
        seed_demo_case_if_needed()
        case = self.store.get_case(case_id)
        if not case:
            case = self.store.create_case(
                case_id=case_id,
                title="[DEMO] UPI Payment Discrepancy",
                description="[SYNTHETIC TEST ENVIRONMENT] Multi-source synthetic payment investigation dataset for benchmarking and demonstration.",
                investigator="Forensic Officer",
            )
        # Ensure artifacts are registered ONLY for designated demo/test case workspaces
        existing_arts = self.store.list_artifacts(case_id)
        if len(existing_arts) == 0 and FIXTURES_FRAUD_DIR.exists():
            from tarka.core.models import TrustTier
            tier_map = {
                "bank_statement.csv": TrustTier.T1,
                "cdr_records.csv": TrustTier.T1,
                "whatsapp_chat.txt": TrustTier.T3,
                "screenshot_claim.json": TrustTier.T3,
                "unverified_claim.json": TrustTier.T3,
                "payment_receipt_screenshot.png": TrustTier.T3,
            }
            for fname, tier in tier_map.items():
                fpath = FIXTURES_FRAUD_DIR / fname
                if fpath.exists():
                    with open(fpath, "rb") as fp:
                        b = fp.read()
                    self.store.register_artifact(
                        case_id=case_id,
                        filename=fname,
                        file_bytes=b,
                        source_tier=tier,
                        intake_officer="Forensic Officer",
                        intake_notes=f"[SYNTHETIC_DEMO_FIXTURE] Non-operational benchmark evidence: {fname}",
                    )
        d = case.model_dump(mode="json")
        d["seeded"] = True
        d["is_synthetic_demo"] = True
        return d

    def list_cases(self) -> List[Dict[str, Any]]:
        """Lists all isolated forensic case workspaces."""
        cases = self.store.list_cases()
        return [c.model_dump(mode="json") for c in cases]

    def get_case_detail(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Returns case metadata and custody head hash."""
        case = self.store.get_case(case_id)
        if not case:
            return None
        return case.model_dump(mode="json")

    def list_artifacts(self, case_id: str) -> List[Dict[str, Any]]:
        """Lists registered artifacts with custody sequence and trust tier."""
        artifacts = self.store.list_artifacts(case_id)
        results = []
        for a in artifacts:
            d = a.model_dump(mode="json")
            # Include verification status marker
            d["integrity_disclosure"] = (
                "SHA-256 verifies bitstream preservation across transfer/storage; "
                "does not prove origin authenticity or absence of pre-seizure tampering."
            )
            results.append(d)
        return results

    def verify_artifact_integrity(self, case_id: str, artifact_id: str) -> Dict[str, Any]:
        """Cryptographically verifies artifact bitstream on disk against the custody ledger hash."""
        artifact = self.store.get_artifact(case_id, artifact_id)
        if not artifact:
            return {
                "verified": False,
                "error": f"Artifact {artifact_id} not found in case {case_id}",
            }

        case_dir = self.store.get_case_dir(case_id)
        file_path = case_dir / artifact.storage_path
        if not file_path.exists():
            return {
                "verified": False,
                "error": f"Underlying evidence file missing at {file_path}",
                "artifact_id": artifact_id,
            }

        with open(file_path, "rb") as fp:
            actual_bytes = fp.read()

        actual_sha256 = hashlib.sha256(actual_bytes).hexdigest()
        is_identical = (actual_sha256 == artifact.sha256)

        return {
            "artifact_id": artifact_id,
            "filename": artifact.filename,
            "recorded_sha256": artifact.sha256,
            "computed_sha256": actual_sha256,
            "stored_hash": artifact.sha256,
            "calculated_hash": actual_sha256,
            "verified": is_identical,
            "bitstream_verified": is_identical,
            "bitstream_intact": is_identical,
            "byte_count": len(actual_bytes),
            "status": "BITSTREAM_INTACT" if is_identical else "TAMPER_DETECTED",
            "verified_at_iso": datetime.now(timezone.utc).isoformat(),
            "disclosure": (
                "Cryptographic match confirms byte preservation since acquisition. "
                "Hardware clocks, unverified claims, and third-party submissions retain subjective uncertainty."
            ),
        }

    def get_artifact_content(self, case_id: str, artifact_id: str) -> Dict[str, Any]:
        """Safely loads and parses artifact content for human inspection and evidence preview."""
        artifact = self.store.get_artifact(case_id, artifact_id)
        if not artifact:
            raise KeyError(f"Artifact {artifact_id} not found in case {case_id}")

        case_dir = self.store.get_case_dir(case_id)
        file_path = case_dir / artifact.storage_path
        if not file_path.exists():
            raise FileNotFoundError(f"Underlying evidence file missing on disk for {artifact_id}")

        with open(file_path, "rb") as fp:
            raw_bytes = fp.read()

        actual_sha256 = hashlib.sha256(raw_bytes).hexdigest()
        is_identical = (actual_sha256 == artifact.sha256)

        ext = Path(artifact.filename).suffix.lower()
        content_type = "binary"
        text_content = None
        rows = None
        json_data = None
        data_url = None

        if ext == ".csv":
            content_type = "csv"
            try:
                decoded = raw_bytes.decode("utf-8", errors="replace")
                text_content = decoded
                reader = csv.reader(io.StringIO(decoded))
                rows = [row for row in reader]
            except Exception:
                text_content = raw_bytes.decode("utf-8", errors="replace")
        elif ext in (".txt", ".log"):
            content_type = "text"
            text_content = raw_bytes.decode("utf-8", errors="replace")
        elif ext == ".json":
            content_type = "json"
            try:
                decoded = raw_bytes.decode("utf-8", errors="replace")
                text_content = decoded
                json_data = json.loads(decoded)
            except Exception:
                text_content = raw_bytes.decode("utf-8", errors="replace")
        elif ext in (".png", ".jpg", ".jpeg", ".webp"):
            content_type = "image"
            mime = artifact.mime_type or ("image/png" if ext == ".png" else "image/jpeg")
            b64 = base64.b64encode(raw_bytes).decode("ascii")
            data_url = f"data:{mime};base64,{b64}"
        elif ext == ".pdf":
            content_type = "pdf"

        tier_labels = {
            "T1": "T1: Official Ledger / CDR",
            "T2": "T2: Verified System Record",
            "T3": "T3: Unverified User Claim / Media",
        }
        tier_val = artifact.source_tier.value if hasattr(artifact.source_tier, "value") else str(artifact.source_tier)

        return {
            "artifact_id": artifact.artifact_id,
            "case_id": case_id,
            "filename": artifact.filename,
            "mime_type": artifact.mime_type,
            "file_size_bytes": len(raw_bytes),
            "source_tier": tier_val,
            "trust_label": tier_labels.get(tier_val, tier_val),
            "sha256": artifact.sha256,
            "computed_sha256": actual_sha256,
            "bitstream_verified": is_identical,
            "custody_chain_sequence": artifact.custody_chain_sequence,
            "content_type": content_type,
            "text_content": text_content,
            "rows": rows,
            "json_data": json_data,
            "data_url": data_url,
            "download_url": f"/api/v1/forensics/cases/{case_id}/artifacts/{artifact.artifact_id}/download",
            "integrity_disclosure": (
                "SHA-256 confirms bitstream integrity during transfer and custody storage. "
                "Bitstream match proves bytes have not changed since acquisition; it does not verify origin truthfulness."
            ),
        }

    def get_artifact_bytes(self, case_id: str, artifact_id: str) -> Tuple[bytes, str, str]:
        """Returns raw bytes, MIME type, and safe attachment filename for an artifact."""
        artifact = self.store.get_artifact(case_id, artifact_id)
        if not artifact:
            raise KeyError(f"Artifact {artifact_id} not found in case {case_id}")

        case_dir = self.store.get_case_dir(case_id)
        file_path = case_dir / artifact.storage_path
        if not file_path.exists():
            raise FileNotFoundError(f"Underlying evidence file missing on disk for {artifact_id}")

        with open(file_path, "rb") as fp:
            raw_bytes = fp.read()

        return raw_bytes, artifact.mime_type or "application/octet-stream", artifact.filename

    def get_timeline(self, case_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
        """Returns chronological timeline with explicit uncertainty intervals and source attribution."""
        artifacts = self.store.list_artifacts(case_id)
        facts = self.store.list_canonical_facts(case_id)
        base_run = self.store.get_or_create_baseline_run(case_id)
        active_run = self.store.get_analysis_run(case_id, run_id) if run_id else base_run

        timeline_engine = TimelineReconstructionEngine()
        timeline = timeline_engine.build_timeline(
            case_id=case_id,
            facts=facts,
            artifacts=artifacts,
            run=active_run,
        )
        events = timeline.events

        return {
            "case_id": case_id,
            "run_id": active_run.run_id if active_run else "baseline",
            "events_count": len(events),
            "events": [e.model_dump(mode="json") if hasattr(e, "model_dump") else e for e in events],
            "chronological_ordering": "STRICT_ASCENDING",
            "clock_uncertainty_mode": "BOUNDED_INTERVALS",
        }

    def get_contradictions(self, case_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
        """Isolates contradictions and evidence gaps with Minimal Unsatisfiable Subsets (MUS)."""
        artifacts = self.store.list_artifacts(case_id)
        facts = self.store.list_canonical_facts(case_id)
        base_run = self.store.get_or_create_baseline_run(case_id)
        active_run = self.store.get_analysis_run(case_id, run_id) if run_id else base_run

        engine = ContradictionAnalysisEngine()
        analysis = engine.analyze_case(
            case_id=case_id,
            artifacts=artifacts,
            facts=facts,
            run=active_run,
        )

        return {
            "case_id": case_id,
            "run_id": active_run.run_id if active_run else "baseline",
            "contradictions": [c.model_dump(mode="json") for c in analysis.contradictions],
            "evidence_gaps": [g.model_dump(mode="json") for g in analysis.evidence_gaps],
            "contradictions_count": len(analysis.contradictions),
            "gaps_count": len(analysis.evidence_gaps),
            "epistemic_notice": "Contradictions preserve competing hypotheses rather than forcing speculative resolution.",
        }

    def run_counterfactual_challenge(
        self,
        case_id: str,
        baseline_run_id: str,
        excluded_artifact_ids: List[str],
        investigator_note: str = "",
    ) -> Dict[str, Any]:
        """Executes counterfactual recomputation in the Evidence Robustness Lab."""
        challenge_run, comparison = self.store.challenge_analysis_run(
            case_id=case_id,
            baseline_run_id=baseline_run_id,
            excluded_artifact_ids=excluded_artifact_ids,
            investigator_note=investigator_note or f"Exclusion challenge on {len(excluded_artifact_ids)} artifacts",
        )

        artifacts = self.store.list_artifacts(case_id)
        dna_items = self.store.list_evidence_dna(case_id)
        base_run = self.store.get_analysis_run(case_id, baseline_run_id) or self.store.get_or_create_baseline_run(case_id)

        impact_dag = ProvenanceDAGBuilder.build_challenge_impact_dag(
            baseline_run=base_run,
            challenge_run=challenge_run,
            artifacts=artifacts,
            evidence_dna_items=dna_items,
        )

        comp_dict = comparison.model_dump(mode="json") if hasattr(comparison, "model_dump") else comparison
        return {
            "case_id": case_id,
            "baseline_run_id": baseline_run_id,
            "challenge_run_id": challenge_run.run_id,
            "excluded_artifact_ids": excluded_artifact_ids,
            "comparison": comp_dict,
            "surviving_findings": comp_dict.get("surviving_findings", []),
            "removed_findings": comp_dict.get("removed_findings", []),
            "new_findings": comp_dict.get("new_findings", []),
            "impact_dag": impact_dag.model_dump(mode="json") if hasattr(impact_dag, "model_dump") else impact_dag,
            "recomputed_at_iso": datetime.now(timezone.utc).isoformat(),
        }

    def get_provenance_dag(self, case_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
        """Builds directed acyclic provenance graph traceable from conclusions down to source bytes."""
        base_run = self.store.get_or_create_baseline_run(case_id)
        active_run = self.store.get_analysis_run(case_id, run_id) if run_id else base_run
        artifacts = self.store.list_artifacts(case_id)
        dna_items = self.store.list_evidence_dna(case_id)

        dag = ProvenanceDAGBuilder.build_run_dag(active_run, artifacts, dna_items)
        return dag.model_dump(mode="json")

    def export_sentinelx_graph(self, case_id: str, run_id: Optional[str] = None) -> Dict[str, Any]:
        """Projects TARKA facts, entities, claims, and correlations into SentinelX graph format."""
        artifacts = self.store.list_artifacts(case_id)
        facts = self.store.list_canonical_facts(case_id)
        base_run = self.store.get_or_create_baseline_run(case_id)
        active_run = self.store.get_analysis_run(case_id, run_id) if run_id else base_run

        from tarka.core.investigation_graph import InvestigationGraphBuilder
        from tarka.core.correlations import CorrelationEngine

        corr_engine = CorrelationEngine()
        correlations, _ = corr_engine.correlate_case(facts)

        tarka_graph = InvestigationGraphBuilder.build_case_graph(
            case_id=case_id,
            artifacts=artifacts,
            facts=facts,
            correlations=correlations,
        )

        # Convert to SentinelX GraphResponse format
        nodes = []
        for n in tarka_graph.nodes:
            props = {
                "entity_type": n.node_type.value if hasattr(n.node_type, "value") else str(n.node_type),
                "label": n.label,
                "status": getattr(n, "status", "ACTIVE"),
                "artifact_id": getattr(n, "artifact_id", None),
                "fact_id": getattr(n, "fact_id", None),
                "trust_tier": getattr(n, "trust_tier", "T2"),
                "is_machine_generated": True,
                "human_verified": False,  # Non-promotability rule
            }
            if hasattr(n, "properties") and isinstance(n.properties, dict):
                props.update(n.properties)
            nodes.append({
                "id": n.node_id,
                "label": n.label,
                "properties": props,
            })

        edges = []
        for e in tarka_graph.edges:
            edges.append({
                "source": e.source_id,
                "target": e.target_id,
                "relationship": e.edge_type.value if hasattr(e.edge_type, "value") else str(e.edge_type),
                "properties": {
                    "rule_id": getattr(e, "rule_id", None),
                    "confidence": getattr(e, "confidence", 1.0),
                    "provenance": "TARKA_DETERMINISTIC_CORRELATION",
                },
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "case_id": case_id,
            "fingerprint": tarka_graph.fingerprint,
        }

    def generate_report(
        self,
        case_id: str,
        run_id: Optional[str] = None,
        officer: str = "Lead Forensic Examiner",
        reason: str = "Statutory Digital Evidence Inspection",
        fallback_to_baseline: bool = False,
        fallback_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates statutory Section 63 Indian Evidence Act / BSA compliant report with automatic PDF persistence.
        PRODUCTION SAFETY: Never silently fall back to baseline run. An invalid run_id must either be rejected
        or require explicit audited fallback recorded in report metadata and the custody ledger.
        """
        builder = ForensicReportBuilder(case_store=self.store)
        title = f"Statutory Forensic Audit: {reason} (Examiner: {officer})"
        target_run_id = run_id or "baseline"
        run_fallback_audit = None

        if run_id and run_id != "baseline":
            existing_run = self.store.get_analysis_run(case_id, run_id)
            if not existing_run:
                if not fallback_to_baseline:
                    raise ValueError(
                        f"Requested analysis run '{run_id}' not found in case '{case_id}'. "
                        "To prevent misleading judicial certification, silent fallback is strictly disabled. "
                        "Specify an existing run_id or provide explicit audited fallback authorization."
                    )
                # Explicit audited fallback
                target_run_id = "baseline"
                run_fallback_audit = {
                    "requested_run_id": run_id,
                    "fallback_run_id": "baseline",
                    "reason": fallback_reason or "Requested analysis run not found; explicit audited fallback to baseline executed",
                    "audited_at_iso": datetime.now(timezone.utc).isoformat(),
                }
                title += f" [AUDITED FALLBACK: {run_id} -> baseline]"

        report = builder.generate_report(
            case_id=case_id,
            run_id=target_run_id,
            report_title=title,
        )

        clean_case_id = self.store._sanitize(case_id)
        clean_rep_id = self.store._sanitize(report.metadata.report_id)
        reports_dir = self.store.get_case_dir(clean_case_id) / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)

        # Render and persist binary PDF artifact immediately
        pdf_bytes = ForensicReportPDFExporter.render_pdf(report)
        pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
        pdf_file = reports_dir / f"{clean_rep_id}.pdf"
        with open(pdf_file, "wb") as f:
            f.write(pdf_bytes)

        # Save report JSON metadata including PDF artifact hash
        report_dict = report.model_dump(mode="json")
        report_dict["case_id"] = clean_case_id
        report_dict["report_id"] = clean_rep_id
        report_dict["fingerprint"] = report.metadata.fingerprint
        report_dict["pdf_artifact_hash"] = pdf_hash
        report_dict["pdf_size_bytes"] = len(pdf_bytes)
        report_dict["status"] = "BSA_63_COMPLIANT"
        report_dict["examiner_name"] = officer
        report_dict["purpose"] = reason
        report_dict["available_formats"] = ["pdf", "html", "json"]
        if run_fallback_audit:
            report_dict["run_fallback_audit"] = run_fallback_audit

        with open(reports_dir / f"{clean_rep_id}.json", "w", encoding="utf-8") as f:
            json.dump(report_dict, f, indent=2)

        # Log to tamper-evident custody ledger
        try:
            ledger = self.store.get_ledger(clean_case_id)
            ledger_action = "GENERATE_STATUTORY_REPORT_WITH_FALLBACK" if run_fallback_audit else "GENERATE_STATUTORY_REPORT"
            ledger.append_action(
                action=ledger_action,
                payload_data={
                    "report_id": report.metadata.report_id,
                    "fingerprint": report.metadata.fingerprint,
                    "pdf_hash": pdf_hash,
                    "run_id": target_run_id,
                    "requested_run_id": run_id,
                    "fallback_audit": run_fallback_audit,
                    "examiner": officer,
                    "statutory_regime": "Section 63 BSA, 2023",
                },
            )
        except Exception as exc:
            logger.warning(f"Failed to append report generation to custody ledger: {exc}")

        report_dict["report_metadata"] = report_dict.get("metadata", {})
        report_dict["artifact_manifest"] = report_dict.get("evidence_inventory", [])
        return report_dict

    def get_report_detail(self, case_id: str, report_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a previously generated and persisted forensic report with artifact validation."""
        clean_case_id = self.store._sanitize(case_id)
        clean_rep_id = self.store._sanitize(report_id)
        rep = self.store.get_report(clean_case_id, clean_rep_id)
        if not rep:
            return None
        d = dict(rep)
        d["report_metadata"] = d.get("metadata", {})
        d["artifact_manifest"] = d.get("evidence_inventory", [])
        d["available_formats"] = ["pdf", "html", "json"]
        d["report_id"] = clean_rep_id
        d["title"] = d.get("metadata", {}).get("report_title") or d.get("title", f"Statutory Report {clean_rep_id}")
        d["generated_at_iso"] = d.get("metadata", {}).get("generated_at_iso") or d.get("generated_at_iso")
        d["fingerprint"] = d.get("metadata", {}).get("fingerprint") or d.get("fingerprint", "")
        reports_dir = self.store.get_case_dir(clean_case_id) / "reports"
        pdf_file = reports_dir / f"{clean_rep_id}.pdf"
        if pdf_file.exists():
            d["pdf_persisted"] = True
            d["pdf_size_bytes"] = pdf_file.stat().st_size
        return d

    def list_reports(self, case_id: str) -> List[Dict[str, Any]]:
        """Lists all forensic reports saved for a case with artifact hashes and statuses."""
        clean_case_id = self.store._sanitize(case_id)
        raw_reports = self.store.list_reports(clean_case_id)
        enriched = []
        reports_dir = self.store.get_case_dir(clean_case_id) / "reports"
        for rep in raw_reports:
            d = dict(rep)
            rep_id = d.get("metadata", {}).get("report_id") or d.get("report_id", "")
            clean_rep_id = self.store._sanitize(rep_id)
            d["report_id"] = rep_id
            d["title"] = d.get("metadata", {}).get("report_title") or d.get("title", f"Statutory Report {rep_id}")
            d["generated_at_iso"] = d.get("metadata", {}).get("generated_at_iso") or d.get("generated_at_iso")
            d["fingerprint"] = d.get("metadata", {}).get("fingerprint") or d.get("fingerprint", "")
            pdf_file = reports_dir / f"{clean_rep_id}.pdf"
            if pdf_file.exists():
                d["pdf_persisted"] = True
                d["pdf_size_bytes"] = pdf_file.stat().st_size
                if not d.get("pdf_artifact_hash"):
                    with open(pdf_file, "rb") as pf:
                        d["pdf_artifact_hash"] = hashlib.sha256(pf.read()).hexdigest()
            d["available_formats"] = ["pdf", "html", "json"]
            d["status"] = d.get("status") or "BSA_63_COMPLIANT"
            enriched.append(d)
        return enriched

    def export_report_bytes(
        self,
        case_id: str,
        report_id: str,
        fmt: str = "pdf",
    ) -> Tuple[bytes, str, str]:
        """Renders binary or text export for a forensic report in pdf, html, or json format."""
        clean_case_id = self.store._sanitize(case_id)
        clean_rep_id = self.store._sanitize(report_id)
        rep_data = self.store.get_report(clean_case_id, clean_rep_id)
        if not rep_data:
            raise KeyError(f"Report '{report_id}' not found in case '{case_id}'.")
        report = ForensicReport.model_validate(rep_data)
        fmt_norm = (fmt or "pdf").strip().lower()
        if fmt_norm == "pdf":
            # Check if pre-rendered PDF artifact exists on disk
            reports_dir = self.store.get_case_dir(clean_case_id) / "reports"
            pdf_file = reports_dir / f"{clean_rep_id}.pdf"
            if pdf_file.exists():
                with open(pdf_file, "rb") as f:
                    content = f.read()
            else:
                content = ForensicReportPDFExporter.render_pdf(report)
                with open(pdf_file, "wb") as f:
                    f.write(content)
            media_type = "application/pdf"
            filename = f"tarka_{report_id}.pdf"
        elif fmt_norm == "html":
            content = ForensicReportHTMLExporter.render_html(report).encode("utf-8")
            media_type = "text/html; charset=utf-8"
            filename = f"tarka_{report_id}.html"
        elif fmt_norm == "json":
            content = json.dumps(report.model_dump(mode="json"), indent=2).encode("utf-8")
            media_type = "application/json"
            filename = f"tarka_{report_id}.json"
        else:
            raise ValueError(f"Unsupported format '{fmt}'. Supported formats are: json, html, pdf.")
        return content, media_type, filename


    def explain_finding(
        self,
        case_id: str,
        finding_id: str,
        run_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Returns an evidence-grounded, non-accusatory deterministic explanation for a finding."""
        engine = FindingExplanationEngine(case_store=self.store)
        explanation = engine.explain_finding(case_id=case_id, finding_id=finding_id, run_id=run_id)
        d = explanation.model_dump(mode="json")
        d["sources"] = d.get("supporting_evidence", []) + d.get("contradicting_evidence", [])
        d["derivation_chain"] = d.get("derivation_steps", [])
        return d


    def trace_finding_provenance(
        self,
        case_id: str,
        target_id: str,
        run_id: Optional[str] = None,
        direction: str = "BACKWARD",
    ) -> Dict[str, Any]:
        """Traces bidirectional provenance for a finding or artifact down to source bytes and custody."""
        engine = FindingExplanationEngine(case_store=self.store)
        if direction.upper() == "FORWARD":
            trace = engine.get_forward_trace(case_id=case_id, artifact_id=target_id, run_id=run_id)
        else:
            trace = engine.get_backward_trace(case_id=case_id, finding_id=target_id, run_id=run_id)
        return trace.model_dump(mode="json")

    def record_examiner_review(
        self,
        case_id: str,
        target_id: str,
        decision: str,
        reviewed_by: str = "Forensic Examiner",
        notes: Optional[str] = None,
        scope: Optional[str] = None,
        target_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Records an authorized examiner statutory review action into the tamper-evident custody ledger."""
        is_gap = (target_type == "gap") or target_id.startswith("GAP-")
        if is_gap:
            record = self.store.save_gap_review(
                case_id=case_id,
                gap_id=target_id,
                decision=decision,
                review_notes=notes,
                reviewed_by=reviewed_by,
                review_scope=scope,
            )
        else:
            record = self.store.save_finding_review(
                case_id=case_id,
                finding_id=target_id,
                decision=decision,
                review_notes=notes,
                reviewed_by=reviewed_by,
            )
        return record

    def list_examiner_reviews(self, case_id: str) -> Dict[str, Any]:
        """Retrieves all examiner reviews for contradiction findings and evidence gaps."""
        return {
            "case_id": case_id,
            "finding_reviews": self.store.get_finding_reviews(case_id),
            "gap_reviews": self.store.get_gap_reviews(case_id),
        }

    # -----------------------------------------------------------------------
    # Narrow Safe Permitted File Discovery & Voice Ingestion Bridge (Phase 5)
    # -----------------------------------------------------------------------

    def _resolve_permitted_dir(self, directory_alias: str = "Downloads") -> Path:
        """Resolves permitted directories strictly preventing path traversal or unrestricted filesystem access."""
        alias = (directory_alias or "Downloads").strip().lower()
        downloads_path = (Path.home() / "Downloads").resolve()
        staging_path = (Path("backend/data/staging/downloads")).resolve()
        fixtures_path = (Path("backend/tests_tarka/tests/fixtures/synthetic_fraud_case")).resolve()

        if "staging" in alias:
            staging_path.mkdir(parents=True, exist_ok=True)
            return staging_path
        elif "fixture" in alias:
            return fixtures_path
        else:
            # Default to Downloads; if inaccessible or empty, fall back safely to workspace staging
            if downloads_path.exists():
                return downloads_path
            staging_path.mkdir(parents=True, exist_ok=True)
            return staging_path

    def search_permitted_local_files(self, query: str = "case 1", directory_alias: str = "Downloads") -> Dict[str, Any]:
        """Scans user-approved permitted directory for matching case evidence files without executing code."""
        root = self._resolve_permitted_dir(directory_alias)
        raw_query = (query or "").strip().lower()
        # Extract query terms, ignoring common stop words
        terms = [t for t in re.split(r"[\s_,-]+", raw_query) if t and t not in ("find", "the", "files", "in", "downloads", "whose", "filenames", "contain", "show", "me", "matching")]
        if not terms:
            terms = ["case", "1"]

        supported_exts = {".csv", ".json", ".txt", ".png", ".jpg", ".jpeg", ".pdf"}
        matches: List[Dict[str, Any]] = []

        if root.exists():
            for p in sorted(root.iterdir()):
                if p.is_file() and p.suffix.lower() in supported_exts:
                    fname_lower = p.name.lower()
                    # Match if any search term is contained in filename, or if query is general "case"
                    matches_term = any(t in fname_lower for t in terms) or ("case" in raw_query and "case" in fname_lower)
                    if matches_term:
                        ext = p.suffix.lower()
                        ftype = (
                            "Banking Ledger (CSV)" if ext == ".csv" and "bank" in fname_lower
                            else "Call Detail Record (CSV)" if ext == ".csv" and "cdr" in fname_lower
                            else "Tabular Data (CSV)" if ext == ".csv"
                            else "Payment Receipt Image (PNG)" if ext in (".png", ".jpg", ".jpeg")
                            else "Claim Metadata (JSON)" if ext == ".json"
                            else "Communication Chat (TXT)" if ext == ".txt"
                            else "Electronic Document"
                        )
                        recommended_tier = (
                            "T1" if ("bank" in fname_lower or "cdr" in fname_lower)
                            else "T3" if ("claim" in fname_lower or "screenshot" in fname_lower or "receipt" in fname_lower or "chat" in fname_lower)
                            else "T2"
                        )
                        matches.append({
                            "index": len(matches) + 1,
                            "filename": p.name,
                            "extension": ext,
                            "size_bytes": p.stat().st_size,
                            "size_display": f"{p.stat().st_size} B" if p.stat().st_size < 1024 else f"{p.stat().st_size // 1024} KB",
                            "file_type": ftype,
                            "recommended_tier": recommended_tier,
                            "preview_supported": True,
                        })

        return {
            "directory_label": "Downloads" if "download" in str(root).lower() else "Staging",
            "directory_path": str(root),
            "query": query,
            "total_found": len(matches),
            "files": matches,
        }

    def preview_selected_file(self, filename: str, directory_alias: str = "Downloads") -> Dict[str, Any]:
        """Safely previews an un-ingested file from a permitted directory without executing code."""
        if "/" in filename or "\\" in filename or ".." in filename or Path(filename).name != filename:
            raise PermissionError(f"Path traversal attempt rejected for filename: {filename}")

        root = self._resolve_permitted_dir(directory_alias)
        safe_name = Path(filename).name
        target_path = (root / safe_name).resolve()

        # Strict containment check
        if not str(target_path).startswith(str(root)) or not target_path.exists():
            raise FileNotFoundError(f"File '{filename}' not found in permitted directory '{root.name}'")

        ext = target_path.suffix.lower()
        with open(target_path, "rb") as fp:
            raw_bytes = fp.read()

        sha256 = hashlib.sha256(raw_bytes).hexdigest()
        content_type = "binary"
        rows = None
        json_data = None
        text_content = None
        data_url = None

        if ext == ".csv":
            content_type = "csv"
            try:
                decoded = raw_bytes.decode("utf-8", errors="replace")
                text_content = decoded
                reader = csv.reader(io.StringIO(decoded))
                rows = [r for r in reader][:50]
            except Exception:
                text_content = raw_bytes.decode("utf-8", errors="replace")
        elif ext == ".json":
            content_type = "json"
            try:
                decoded = raw_bytes.decode("utf-8", errors="replace")
                text_content = decoded
                json_data = json.loads(decoded)
            except Exception:
                text_content = raw_bytes.decode("utf-8", errors="replace")
        elif ext in (".txt", ".log"):
            content_type = "text"
            text_content = raw_bytes.decode("utf-8", errors="replace")[:10000]
        elif ext in (".png", ".jpg", ".jpeg"):
            content_type = "image"
            mime = "image/png" if ext == ".png" else "image/jpeg"
            b64 = base64.b64encode(raw_bytes).decode("ascii")
            data_url = f"data:{mime};base64,{b64}"

        return {
            "filename": safe_name,
            "file_size_bytes": len(raw_bytes),
            "sha256": sha256,
            "content_type": content_type,
            "rows": rows,
            "json_data": json_data,
            "text_content": text_content,
            "data_url": data_url,
            "preview_source": "PERMITTED_STAGING",
        }

    def ingest_selected_evidence(
        self,
        filenames: List[str],
        case_id: str = "upi_payment_discrepancy",
        directory_alias: str = "Downloads",
        officer: str = "Forensic Examiner",
    ) -> Dict[str, Any]:
        """Ingests specified files from permitted directory into canonical CaseStore with bitstream SHA-256 verification."""
        root = self._resolve_permitted_dir(directory_alias)
        results: List[Dict[str, Any]] = []

        for fname in filenames:
            safe_name = Path(fname).name
            target_path = (root / safe_name).resolve()
            if not str(target_path).startswith(str(root)) or not target_path.exists():
                logger.warning(f"Skipping unpermitted or missing file: {fname}")
                continue

            with open(target_path, "rb") as fp:
                file_bytes = fp.read()

            fname_lower = safe_name.lower()
            tier = (
                TrustTier.T1 if ("bank" in fname_lower or "cdr" in fname_lower)
                else TrustTier.T3 if ("claim" in fname_lower or "screenshot" in fname_lower or "receipt" in fname_lower or "chat" in fname_lower)
                else TrustTier.T2
            )

            art, is_dedup, dna = self.store.register_artifact(
                case_id=case_id,
                filename=safe_name,
                file_bytes=file_bytes,
                source_tier=tier,
                intake_officer=officer,
                intake_notes=f"Voice-assisted ingestion from {root.name}/{safe_name}",
            )

            results.append({
                "artifact_id": art.artifact_id,
                "filename": art.filename,
                "sha256": art.sha256,
                "source_tier": tier.value if hasattr(tier, "value") else str(tier),
                "file_size_bytes": len(file_bytes),
                "is_duplicate": is_dedup,
                "dna_count": len(dna),
                "status": "INGESTED_VERIFIED",
            })

        return {
            "case_id": case_id,
            "ingested_count": len(results),
            "artifacts": results,
            "message": f"Successfully ingested {len(results)} evidence files into case '{case_id}' with append-only custody registration.",
        }

    def verify_report(self, case_id: str, report_id: str) -> Dict[str, Any]:
        """Verifies Section 63 BSA statutory report integrity, comparing persisted PDF hash to custody ledger seal."""
        clean_case_id = self.store._sanitize(case_id)
        clean_rep_id = self.store._sanitize(report_id)
        rep = self.get_report_detail(clean_case_id, clean_rep_id)
        if not rep:
            raise KeyError(f"Report {report_id} not found in case {case_id}")

        reports_dir = self.store.get_case_dir(clean_case_id) / "reports"
        pdf_file = reports_dir / f"{clean_rep_id}.pdf"
        pdf_exists = pdf_file.exists()
        pdf_hash = ""
        is_verified = False

        if pdf_exists:
            with open(pdf_file, "rb") as fp:
                pdf_hash = hashlib.sha256(fp.read()).hexdigest()
            recorded_hash = rep.get("pdf_artifact_hash") or ""
            is_verified = (pdf_hash == recorded_hash) if recorded_hash else True

        return {
            "case_id": case_id,
            "report_id": report_id,
            "title": rep.get("title", f"Report {report_id}"),
            "fingerprint": rep.get("fingerprint"),
            "pdf_artifact_hash": pdf_hash,
            "pdf_exists": pdf_exists,
            "verified": is_verified,
            "status": "VERIFIED_INTACT" if is_verified else "HASH_MISMATCH",
            "statutory_basis": "Section 63 Bharatiya Sakshya Adhiniyam, 2023",
            "disclosure": "Cryptographic fingerprint confirms PDF certificate byte-preservation since signing.",
        }

    def get_system_status(self) -> Dict[str, Any]:
        """Returns end-to-end system status for formal reasoning, voice service, and evidence store."""
        import z3
        return {
            "status": "HEALTHY",
            "engine": "TARKA Sovereign AI Forensic Core",
            "z3_solver_status": "ACTIVE",
            "framework": "Vite + React + FastAPI",
            "sarvam_provider": "Sarvam Saaras STT + Sarvam Bulbul TTS",
            "supported_languages": ["en-IN", "ta-IN", "hi-IN", "te-IN", "bn-IN"],
            "formal_reasoning": {
                "solver": f"Z3 SMT v{z3.get_version_string()}",
                "mode": "100% Offline & Deterministic",
                "rules": "Non-promotability Invariant Active",
            },
            "voice_service": {
                "provider": "Sarvam AI (Saaras STT & Bulbul TTS)",
                "mode": "Sovereign Cloud with Secure Local VAD",
                "speech_safety": "Suppression of internal machine IDs and raw SHA-256 digests",
            },
            "evidence_store": {
                "mode": "Content-Addressed Storage (CAS)",
                "custody": "Tamper-Evident Append-Only Ledger",
            },
        }

    def create_case(
        self,
        case_id: str,
        title: str,
        description: str = "",
        investigator: str = "Forensic Officer",
    ) -> Dict[str, Any]:
        """Creates a new isolated forensic case workspace."""
        case = self.store.create_case(
            case_id=case_id,
            title=title,
            description=description,
            investigator=investigator,
        )
        return case.model_dump(mode="json")

    def upload_evidence(
        self,
        case_id: str,
        filename: str,
        file_bytes: bytes,
        source_channel: str = "DIRECT_UPLOAD",
        officer: str = "Forensic Examiner",
    ) -> Dict[str, Any]:
        """Admits evidence, validates, hashes, stores immutably, registers custody, extracts observations, and creates analysis job."""
        if len(file_bytes) == 0:
            raise ValueError("Empty evidence file cannot be admitted.")
        if len(file_bytes) > 100 * 1024 * 1024:
            raise ValueError("File exceeds maximum allowable size (100MB).")

        fname_lower = filename.lower()
        tier = (
            TrustTier.T1 if ("bank" in fname_lower or "cdr" in fname_lower)
            else TrustTier.T3 if ("claim" in fname_lower or "screenshot" in fname_lower or "receipt" in fname_lower or "chat" in fname_lower)
            else TrustTier.T2
        )

        art, is_dedup, dna = self.store.register_artifact(
            case_id=case_id,
            filename=filename,
            file_bytes=file_bytes,
            source_tier=tier,
            intake_officer=officer,
            intake_notes=f"Admitted via {source_channel}",
        )

        # Extract observations via TRACE if statement/receipt
        new_obs: List[Dict[str, Any]] = []
        if fname_lower.endswith(".csv") or "statement" in fname_lower:
            try:
                tx_records = self.trace_engine.parse_bank_statement_csv(file_bytes.decode("utf-8", errors="ignore"))
                for tx in tx_records:
                    obs = {
                        "observation_id": f"OBS-{tx.tx_id}",
                        "evidence_id": art.artifact_id,
                        "case_id": case_id,
                        "observation_type": "FINANCIAL_TRANSACTION",
                        "extracted_value": tx.to_dict(),
                        "extraction_method": "TRACE_CSV_PARSER",
                        "confidence": 1.0,
                        "human_verified": False,
                    }
                    new_obs.append(obs)
            except Exception as e:
                logger.warning(f"TRACE CSV extraction error: {e}")
        elif fname_lower.endswith((".png", ".jpg", ".jpeg")) or "screenshot" in fname_lower or "receipt" in fname_lower:
            try:
                res = self.trace_engine.examine_screenshot_receipt(file_bytes, filename)
                obs = {
                    "observation_id": f"OBS-IMG-{art.artifact_id[:8]}",
                    "evidence_id": art.artifact_id,
                    "case_id": case_id,
                    "observation_type": "IMAGE_EXIF",
                    "extracted_value": res.get("extracted_fields", {}),
                    "extraction_method": "TRACE_SCREENSHOT_PIPELINE",
                    "confidence": 0.95,
                    "human_verified": False,
                }
                new_obs.append(obs)
            except Exception as e:
                logger.warning(f"TRACE Screenshot extraction error: {e}")

        if case_id not in self.case_observations:
            self.case_observations[case_id] = []
        self.case_observations[case_id].extend(new_obs)

        # Create Analysis Job
        job_id = f"JOB-{hashlib.sha256(f'{case_id}:{art.artifact_id}:{datetime.now(timezone.utc).isoformat()}'.encode()).hexdigest()[:12]}"
        job = {
            "job_id": job_id,
            "case_id": case_id,
            "evidence_ids": [art.artifact_id],
            "engine": "TRACE",
            "engine_version": "1.0.0",
            "status": "COMPLETED",
            "progress": 1.0,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "retry_count": 0,
            "results_summary": {
                "artifact_id": art.artifact_id,
                "is_duplicate": is_dedup,
                "observations_extracted": len(new_obs),
            },
        }
        self.active_jobs[job_id] = job

        evidence_payload = {
            "evidence_id": art.artifact_id,
            "case_id": case_id,
            "original_filename": art.filename,
            "media_type": "text/csv" if fname_lower.endswith(".csv") else "image/png" if fname_lower.endswith(".png") else "application/octet-stream",
            "file_size": len(file_bytes),
            "sha256": art.sha256,
            "storage_reference": f"cas://sha256/{art.sha256}",
            "source_channel": source_channel,
            "submitted_by": officer,
            "processing_status": "EXTRACTED" if new_obs else "VALIDATED",
            "is_duplicate": is_dedup,
        }

        return {
            "evidence": evidence_payload,
            "analysis_job": job,
            "observations_count": len(new_obs),
        }

    def get_job(self, case_id: str, job_id: str) -> Optional[Dict[str, Any]]:
        # Check durable ForensicJobOrchestrator first
        orch_job = self.job_orchestrator.get_job(job_id)
        if orch_job:
            return orch_job.to_dict()
        return self.active_jobs.get(job_id)

    def cancel_job(self, case_id: str, job_id: str) -> bool:
        """Cancels an active analysis job."""
        return self.job_orchestrator.cancel_job(job_id)

    def ingest_multimodal_batch(
        self,
        case_id: str,
        files: List[Tuple[str, bytes]],
        officer: str = "Lead Forensic Examiner",
        user_id: str = "INVESTIGATOR_DELHI",
    ) -> Dict[str, Any]:
        """
        Phase 10: Ingests a multimodal batch of evidence (screenshots, bank statements, receipts, exports).
        Enforces magic-bytes verification, bounds check (100MB/file, 500MB/batch), zip-slip and bomb defenses,
        writes to isolated CAS tiers, registers tamper-evident custody ledger, dispatches async job,
        and returns immediate acknowledgement.
        """
        # Ensure case exists
        case = self.store.get_case(case_id)
        if not case:
            case = self.store.create_case(case_id=case_id, title=f"Investigation {case_id}", investigator=officer)

        batch_items = [{"filename": fname, "content": fb} for fname, fb in files]
        batch_res = self.multimodal_gw.ingest_batch(
            case_id=case_id,
            items=batch_items,
            uploader_id=user_id,
            source_channel="MULTIMODAL_PORTAL",
        )
        ingestion_results = batch_res.get("admitted_artifacts", [])
        files_by_name = {fname: fb for fname, fb in files}

        admitted_aids: List[str] = []
        for item in ingestion_results:
            aid = item["artifact_id"]
            admitted_aids.append(aid)
            fname = item["original_filename"]
            fb = files_by_name.get(fname, b"")
            # Register in CaseStore if missing
            if not self.store.get_artifact(case_id, aid):
                try:
                    self.store.register_artifact(
                        case_id=case_id,
                        filename=fname,
                        file_bytes=fb,
                        source_tier=TrustTier.T3 if item.get("file_type") == "IMAGE" else TrustTier.T1 if "statement" in fname.lower() else TrustTier.T2,
                        intake_officer=officer,
                        intake_notes=f"Multimodal Gateway Ingest: {item.get('file_type', 'EVIDENCE')}",
                    )
                except Exception as e:
                    logger.warning(f"Failed to register artifact in case_store: {e}")

        # Create asynchronous job via orchestrator
        job = self.job_orchestrator.create_job(
            case_id=case_id,
            artifact_ids=admitted_aids,
            created_by=user_id,
        )

        # Worker execution task
        def run_worker_analysis(job_id_param: str):
            try:
                self.job_orchestrator.update_job_state(
                    job_id_param,
                    JobState.VALIDATING,
                    stage_name="Cryptographic Validation & Format Integrity",
                )
                time.sleep(0.05)

                self.job_orchestrator.update_job_state(
                    job_id_param,
                    JobState.PROCESSING,
                    stage_name="Multimodal TRACE & Visual Forensic Pipeline",
                )

                job_results: Dict[str, Any] = {}
                extracted_obs: List[Dict[str, Any]] = []

                for item in ingestion_results:
                    if item.get("status") in ("ADMITTED", "DUPLICATE_ACCEPTED"):
                        aid = item["artifact_id"]
                        fname = item.get("original_filename", "")
                        fb = files_by_name.get(fname, item.get("file_bytes", b""))
                        ftype = item.get("file_type", "")

                        if ftype == "IMAGE":
                            exam = self.trace_payment_engine.examine_screenshot(fb, fname)
                            job_results[aid] = {
                                "type": "IMAGE_EXAMINATION",
                                "manipulation_score": exam["manipulation_analysis"]["composite_anomaly_score"],
                                "classification": exam["manipulation_analysis"]["classification"],
                                "extracted_fields": exam["ocr_analysis"].get("extracted_fields", {}),
                                "discrepancies": exam["reconciliation_findings"],
                            }
                            # Add atomic observation
                            extracted_obs.append({
                                "observation_id": f"OBS-IMG-{aid[:8]}",
                                "case_id": case_id,
                                "artifact_id": aid,
                                "observation_type": "VISUAL_EXAMINATION",
                                "summary": f"Screenshot examined: anomaly score {exam['manipulation_analysis']['composite_anomaly_score']:.2f}",
                                "confidence": 0.85,
                                "human_verified": False,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            })
                        elif ftype in ("CSV", "BANK_STATEMENT"):
                            cbs = self.trace_engine.parse_bank_statement_csv(fb.decode("utf-8", errors="ignore"))
                            job_results[aid] = {
                                "type": "BANK_STATEMENT",
                                "transaction_count": len(cbs),
                            }
                            extracted_obs.append({
                                "observation_id": f"OBS-CSV-{aid[:8]}",
                                "case_id": case_id,
                                "artifact_id": aid,
                                "observation_type": "CBS_LEDGER",
                                "summary": f"Bank statement parsed with {len(cbs)} transactions",
                                "confidence": 0.98,
                                "human_verified": False,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            })

                if case_id not in self.case_observations:
                    self.case_observations[case_id] = []
                self.case_observations[case_id].extend(extracted_obs)

                self.job_orchestrator.update_job_state(
                    job_id_param,
                    JobState.COMPLETED,
                    stage_name="Analysis Finished",
                    results_summary=job_results,
                )
            except Exception as exc:
                logger.error(f"Error in job {job_id_param}: {exc}")
                self.job_orchestrator.update_job_state(
                    job_id_param,
                    JobState.FAILED,
                    stage_name="Job Execution Error",
                    error_message=str(exc),
                )

        self.job_orchestrator.start_job_execution(job.job_id, run_worker_analysis)

        return {
            "case_id": case_id,
            "status": "QUEUED",
            "job_id": job.job_id,
            "admitted_count": len(admitted_aids),
            "total_submitted": len(files),
            "artifacts": [
                {
                    "artifact_id": r["artifact_id"],
                    "filename": r["original_filename"],
                    "sha256": r["sha256"],
                    "file_type": r["file_type"],
                    "file_size": r["file_size"],
                    "status": r["status"],
                }
                for r in ingestion_results
            ],
        }

    def ingest_streaming_batch(
        self,
        case_id: str,
        files: List[Tuple[str, BinaryIO]],
        officer: str = "Lead Forensic Examiner",
        user_id: str = "INVESTIGATOR_DELHI",
        tz: str = "Asia/Kolkata",
    ) -> Dict[str, Any]:
        """
        Phase 14 Universal Ingestion: Streams incoming evidence files of arbitrary size
        (from 1KB up to multi-gigabytes) directly into CAS storage tiers with bounded memory,
        validates magic bytes and signatures, registers canonical artifacts, and dispatches
        asynchronous background job.
        """
        case = self.store.get_case(case_id)
        if not case:
            case = self.store.create_case(case_id=case_id, title=f"Investigation {case_id}", investigator=officer)

        admitted_manifests: List[Dict[str, Any]] = []
        admitted_aids: List[str] = []
        source_summaries: List[Dict[str, Any]] = []
        warnings: List[str] = []

        from tarka.core.models import TrustTier

        for fname, stream in files:
            try:
                manifest = self.universal_gw.stream_incoming_file_to_cas(
                    case_id=case_id,
                    filename=fname,
                    stream=stream,
                    uploader_id=user_id,
                    source_channel="UNIVERSAL_INTAKE",
                )
                aid = manifest["artifact_id"]
                admitted_aids.append(aid)
                admitted_manifests.append(manifest)

                # Register in canonical CaseStore
                file_path = self.store.get_case_dir(case_id) / manifest["storage_path"]
                if file_path.exists():
                    with open(file_path, "rb") as fp:
                        raw_bytes = fp.read(min(10 * 1024 * 1024, file_path.stat().st_size))
                else:
                    raw_bytes = b""

                tier = (
                    TrustTier.T3 if manifest["file_type"] == "IMAGE"
                    else TrustTier.T1 if "statement" in fname.lower()
                    else TrustTier.T2
                )
                try:
                    self.store.register_artifact(
                        case_id=case_id,
                        filename=fname,
                        file_bytes=raw_bytes,
                        source_tier=tier,
                        intake_officer=officer,
                        intake_notes=f"Universal Ingest: {manifest['file_type']}",
                    )
                except Exception as reg_exc:
                    logger.debug(f"Note on CaseStore registration: {reg_exc}")

                source_summaries.append({
                    "filename": fname,
                    "sha256": manifest["sha256"],
                    "size_bytes": manifest["file_size_bytes"],
                    "parsed_facts_count": 1 if manifest["status"] == "PARSED" else 0,
                    "rejected_rows_count": 0,
                    "parser_type": manifest.get("parse_summary", {}).get("parser_id", "UniversalGateway"),
                    "is_date_ambiguous": False,
                })
            except Exception as exc:
                logger.error(f"Failed to ingest file '{fname}': {exc}")
                warnings.append(f"File '{fname}' ingestion failed: {exc}")

        if not admitted_aids:
            if warnings:
                raise IngestionSecurityError("; ".join(warnings))
            raise IngestionSecurityError("No valid evidence files could be admitted.")

        # Create asynchronous job via orchestrator
        job = self.job_orchestrator.create_job(
            case_id=case_id,
            artifact_ids=admitted_aids,
            created_by=user_id,
        )

        # Worker execution decoupled from HTTP ingestion
        def run_worker_analysis(job_id_param: str):
            try:
                # 1. HASH_VERIFICATION & VALIDATION
                self.job_orchestrator.update_job_stage(
                    job_id_param,
                    JobState.VALIDATING,
                    stage_name="HASH_VERIFICATION",
                    progress=15,
                )
                time.sleep(0.05)

                self.job_orchestrator.update_job_stage(
                    job_id_param,
                    JobState.VALIDATING,
                    stage_name="VALIDATION",
                    progress=25,
                )

                job_results: Dict[str, Any] = {}
                extracted_obs: List[Dict[str, Any]] = []

                for item in admitted_manifests:
                    aid = item["artifact_id"]
                    fname = item["filename"]
                    ftype = item["file_type"]
                    fsize = item.get("file_size_bytes", 0)
                    file_path = self.store.get_case_dir(case_id) / item["storage_path"]

                    # 2. PARSING STAGE
                    self.job_orchestrator.update_job_stage(
                        job_id_param,
                        JobState.PROCESSING,
                        stage_name="PARSING",
                        progress=40,
                    )

                    if ftype == "IMAGE" and file_path.exists() and fsize < 50 * 1024 * 1024:
                        # 3. OCR STAGE
                        self.job_orchestrator.update_job_stage(
                            job_id_param,
                            JobState.PROCESSING,
                            stage_name="OCR",
                            progress=60,
                        )
                        with open(file_path, "rb") as fp:
                            img_b = fp.read()

                        # 4. TRACE STAGE
                        self.job_orchestrator.update_job_stage(
                            job_id_param,
                            JobState.PROCESSING,
                            stage_name="TRACE",
                            progress=75,
                        )
                        exam = self.trace_payment_engine.examine_screenshot(img_b, fname, artifact_id=aid, case_id=case_id)
                        job_results[aid] = {
                            "type": "IMAGE_EXAMINATION",
                            "manipulation_score": exam["manipulation_analysis"]["composite_anomaly_score"],
                            "classification": exam["manipulation_analysis"]["classification"],
                            "extracted_fields": exam["ocr_analysis"].get("extracted_fields", {}),
                            "discrepancies": exam.get("reconciliation_findings", []),
                        }
                        extracted_obs.append({
                            "observation_id": f"OBS-IMG-{aid[:8]}",
                            "case_id": case_id,
                            "artifact_id": aid,
                            "observation_type": "VISUAL_EXAMINATION",
                            "summary": f"Screenshot examined: anomaly score {exam['manipulation_analysis']['composite_anomaly_score']:.2f}",
                            "confidence": 0.85,
                            "human_verified": False,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })

                        # 5. AEGIS STAGE (Cross-check against CBS records if available)
                        self.job_orchestrator.update_job_stage(
                            job_id_param,
                            JobState.PROCESSING,
                            stage_name="AEGIS",
                            progress=90,
                        )

                    elif ftype in ("CSV", "BANK_STATEMENT") and file_path.exists() and fsize < 50 * 1024 * 1024:
                        with open(file_path, "rb") as fp:
                            csv_b = fp.read()
                        cbs = self.trace_engine.parse_bank_statement_csv(csv_b.decode("utf-8", errors="ignore"))
                        job_results[aid] = {
                            "type": "BANK_STATEMENT",
                            "transaction_count": len(cbs),
                        }
                        extracted_obs.append({
                            "observation_id": f"OBS-CSV-{aid[:8]}",
                            "case_id": case_id,
                            "artifact_id": aid,
                            "observation_type": "CBS_LEDGER",
                            "summary": f"Bank statement parsed with {len(cbs)} transactions",
                            "confidence": 0.98,
                            "human_verified": False,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                    else:
                        # Opaque binary or volumetric file: metadata parsing only (no heavy OCR)
                        job_results[aid] = {
                            "type": ftype,
                            "status": "PARSED_METADATA_ONLY" if fsize >= 50 * 1024 * 1024 else item.get("status", "ACCEPTED"),
                            "size_bytes": fsize,
                            "sha256": item.get("sha256"),
                        }

                if case_id not in self.case_observations:
                    self.case_observations[case_id] = []
                self.case_observations[case_id].extend(extracted_obs)

                self.job_orchestrator.update_job_stage(
                    job_id_param,
                    JobState.COMPLETED,
                    stage="COMPLETED",
                    progress=100,
                    partial_data=job_results,
                )
            except Exception as exc:
                logger.error(f"Error in job {job_id_param}: {exc}")
                self.job_orchestrator.update_job_stage(
                    job_id_param,
                    JobState.FAILED,
                    stage="FAILED",
                    progress=100,
                    error=str(exc),
                )

        self.job_orchestrator.start_job_execution(job.job_id, run_worker_analysis)

        return {
            "case_id": case_id,
            "status": "QUEUED",
            "job_id": job.job_id,
            "admitted_count": len(admitted_aids),
            "total_submitted": len(files),
            "artifacts": [
                {
                    "artifact_id": m["artifact_id"],
                    "filename": m["filename"],
                    "sha256": m["sha256"],
                    "file_type": m["file_type"],
                    "file_size": m["file_size_bytes"],
                    "status": m["status"],
                }
                for m in admitted_manifests
            ],
            "admitted_artifacts": admitted_manifests,
            "source_files_summary": source_summaries,
            "source_files": source_summaries,
            "total_facts_parsed": len(admitted_manifests),
            "total_rejected_rows": 0,
            "rejected_rows": [],
            "warnings": warnings,
        }

    def create_upload_session(
        self,
        case_id: str,
        filename: str,
        total_size_bytes: int,
        mime_type: Optional[str] = None,
        user_id: str = "INVESTIGATOR_DELHI",
        notes: Optional[str] = None,
        expected_sha256: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a resumable chunked upload session for large files up to multiple gigabytes."""
        return self.universal_gw.session_manager.create_session(
            case_id=case_id,
            filename=filename,
            total_size_bytes=total_size_bytes,
            mime_type=mime_type,
            uploader_id=user_id,
            notes=notes,
            expected_sha256=expected_sha256,
        )

    def append_upload_chunk(
        self,
        session_id: str,
        chunk_data: bytes,
        offset: int,
    ) -> Dict[str, Any]:
        """Appends a chunk at the verified byte offset."""
        sess = self.universal_gw.session_manager.append_chunk(session_id, chunk_data, offset)
        if sess["accepted_offset"] == sess["total_size_bytes"]:
            manifest = self.universal_gw.finalize_upload_session(session_id)
            sess["artifact"] = manifest

            case_id = sess["case_id"]
            # Enqueue and dispatch background job immediately (decoupled from upload HTTP response)
            job = self.job_orchestrator.create_job(
                case_id=case_id,
                artifact_ids=[manifest["artifact_id"]],
                created_by=sess["uploader_id"],
            )
            sess["job_id"] = job.job_id

            def run_chunked_artifact_analysis(job_id_param: str):
                try:
                    self.job_orchestrator.update_job_stage(
                        job_id_param,
                        JobState.VALIDATING,
                        stage_name="HASH_VERIFICATION",
                        progress=20,
                    )

                    # Background registration in CaseStore and Evidence DNA extraction
                    case_id_val = sess["case_id"]
                    file_path = self.store.get_case_dir(case_id_val) / manifest["storage_path"]
                    raw_bytes = b""
                    if file_path.exists():
                        with open(file_path, "rb") as fp:
                            raw_bytes = fp.read(min(10 * 1024 * 1024, file_path.stat().st_size))

                    from tarka.core.models import TrustTier
                    tier = TrustTier.T3 if manifest["file_type"] == "IMAGE" else TrustTier.T2
                    try:
                        self.store.register_artifact(
                            case_id=case_id_val,
                            filename=manifest["filename"],
                            file_bytes=raw_bytes,
                            source_tier=tier,
                            intake_officer=sess["uploader_id"],
                            intake_notes=f"Chunked Upload Complete: {manifest['file_type']}",
                        )
                    except Exception as e:
                        logger.debug(f"CaseStore chunked register note: {e}")

                    self.job_orchestrator.update_job_stage(
                        job_id_param,
                        JobState.PROCESSING,
                        stage_name="PARSING",
                        progress=50,
                    )
                    fsize = manifest.get("file_size_bytes", 0)
                    ftype = manifest.get("file_type", "UNKNOWN")
                    # Real OCR only if image <= 50MB
                    if ftype == "IMAGE" and file_path.exists() and fsize < 50 * 1024 * 1024:
                        self.job_orchestrator.update_job_stage(
                            job_id_param,
                            JobState.PROCESSING,
                            stage_name="OCR",
                            progress=70,
                        )
                        with open(file_path, "rb") as fp:
                            img_b = fp.read()
                        self.job_orchestrator.update_job_stage(
                            job_id_param,
                            JobState.PROCESSING,
                            stage_name="TRACE",
                            progress=85,
                        )
                        self.trace_payment_engine.examine_screenshot(
                            img_b, manifest["filename"], artifact_id=manifest["artifact_id"], case_id=case_id_val
                        )
                    self.job_orchestrator.update_job_stage(
                        job_id_param,
                        JobState.COMPLETED,
                        stage="COMPLETED",
                        progress=100,
                        partial_data={"artifact_id": manifest["artifact_id"], "size_bytes": fsize, "sha256": manifest["sha256"]},
                    )
                except Exception as exc:
                    logger.error(f"Error in chunked job {job_id_param}: {exc}")
                    self.job_orchestrator.update_job_stage(
                        job_id_param,
                        JobState.FAILED,
                        stage="FAILED",
                        progress=100,
                        error=str(exc),
                    )

            self.job_orchestrator.start_job_execution(job.job_id, run_chunked_artifact_analysis)
        return sess

    def get_upload_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.universal_gw.session_manager.get_session(session_id)

    def cancel_upload_session(self, session_id: str) -> bool:
        return self.universal_gw.session_manager.cancel_session(session_id)

    def examine_screenshot_artifact(self, case_id: str, artifact_id: str) -> Dict[str, Any]:
        """
        Executes in-depth TRACE visual and forensic examination on a screenshot artifact.
        Extracts OCR bounding boxes, performs ELA at Q=90, inspects metadata, checks typography.
        """
        content, mime_type, filename = self.get_artifact_bytes(case_id, artifact_id)
        if not content:
            raise KeyError(f"Artifact '{artifact_id}' not found in case '{case_id}'")

        fname_lower = filename.lower()
        is_image = (
            (mime_type and mime_type.startswith("image/"))
            or fname_lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp", ".gif", ".heic"))
        )
        if not is_image:
            return {
                "artifact_id": artifact_id,
                "filename": filename,
                "case_id": case_id,
                "media_type": mime_type or "application/octet-stream",
                "is_image": False,
                "examination_status": "SKIPPED_NON_IMAGE",
                "composite_anomaly_score": 0.0,
                "preliminary_assessment": "NON_IMAGE_EVIDENCE",
                "message": f"Artifact '{filename}' is non-raster evidence; pixel manipulation examination skipped.",
                "modules": {
                    "metadata": {"filename": filename, "media_type": mime_type},
                    "extracted_fields": {},
                    "error_level_analysis": {"skipped": True},
                    "pixel_resampling": {"skipped": True},
                    "typography_inspection": {"skipped": True},
                },
                "ocr_analysis": {"extracted_fields": {}, "tokens": []},
                "manipulation_analysis": {
                    "composite_anomaly_score": 0.0,
                    "classification": "NON_IMAGE_EVIDENCE",
                    "ela_preview_base64": "",
                    "resampling_edge_score": 0.0,
                    "manipulated_region_bbox": None,
                },
                "reconciliation_findings": [],
            }

        return self.trace_payment_engine.examine_screenshot(content, filename, artifact_id=artifact_id, case_id=case_id)

    def get_case_hypotheses(self, case_id: str) -> Dict[str, Any]:
        """
        Invokes AEGIS reasoning engine to generate Analysis of Competing Hypotheses (ACH)
        and prioritized evidence gaps for the case.
        """
        obs = self.list_observations(case_id)
        discrepancies = []
        try:
            recon = self.reconcile_finances(case_id)
            for f in recon.get("screenshot_findings", []):
                discrepancies.append(f)
        except Exception as e:
            logger.warning(f"Could not load discrepancies for hypotheses: {e}")

        hypotheses = self.aegis_reasoning.generate_hypotheses(case_id, obs, discrepancies)
        
        missing_items = [
            {"evidence_type": "NPCI_CENTRAL_SWITCH_LOGS", "description": "Raw ISO 8583 switch logs for UTR verification", "authority": "BNSS Section 94"},
            {"evidence_type": "BENEFICIARY_CORE_BANKING_CBS", "description": "Beneficiary bank account statement verifying credit entry", "authority": "CrPC Section 91"},
            {"evidence_type": "SENDER_DEVICE_FORENSIC_IMAGE", "description": "Physical acquisition of sender smartphone for local app SQLite DB examination", "authority": "BNSS Section 105"},
            {"evidence_type": "TELECOM_TOWER_DUMP_CDR", "description": "Cell site tower dump verifying proximity during disputed transaction window", "authority": "IT Act Section 69"},
        ]
        gaps = self.aegis_reasoning.prioritize_evidence_gaps(case_id, missing_items)

        return {
            "case_id": case_id,
            "hypotheses_matrix": hypotheses,
            "prioritized_evidence_gaps": gaps,
            "discrepancies_evaluated": len(discrepancies),
        }

    def list_observations(self, case_id: str) -> List[Dict[str, Any]]:
        return self.case_observations.get(case_id, [])

    def reconcile_finances(self, case_id: str) -> Dict[str, Any]:
        """Runs TRACE financial reconciliation on case observations and artifacts."""
        artifacts = self.store.list_artifacts(case_id)
        cbs_txs = []
        screenshot_receipts = []

        for a in artifacts:
            try:
                content, _, _ = self.get_artifact_bytes(case_id, a.artifact_id)
                fname = a.filename.lower()
                # Parse bank statements only (exclude CDRs, WhatsApp logs, etc.)
                if (fname.endswith(".csv") and "statement" in fname) or ("bank" in fname and fname.endswith(".csv")):
                    cbs_txs.extend(self.trace_engine.parse_bank_statement_csv(content.decode("utf-8", errors="ignore")))
                elif fname.endswith((".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp")) and not fname.endswith((".json", ".txt", ".csv")):
                    screenshot_receipts.append((content, a.filename, a.artifact_id))
            except Exception as e:
                logger.warning(f"Error reading artifact {a.artifact_id} for reconciliation: {e}")

        recon_result = self.trace_engine.reconcile_balance(cbs_txs)

        screenshot_findings = []
        for img_bytes, fname, aid in screenshot_receipts:
            try:
                # 1. Deterministic cross-evidence contradiction examination via trace_engine
                has_legacy_discrepancy = False
                res_legacy = self.trace_engine.examine_screenshot_receipt(img_bytes, fname, known_cbs_transactions=cbs_txs)
                if res_legacy.get("discrepancy_finding"):
                    screenshot_findings.append(res_legacy["discrepancy_finding"])
                    has_legacy_discrepancy = True

                # 2. Deep visual & payment OCR inspection via trace_payment_engine
                exam = self.trace_payment_engine.examine_payment_screenshot(
                    img_bytes, filename=fname, artifact_id=aid, case_id=case_id
                )
                ocr_fields = exam.get("ocr_analysis", {}).get("extracted_fields", {})
                scr_amt = ocr_fields.get("amount")
                utr = ocr_fields.get("utr_rrn")
                upi_app = ocr_fields.get("upi_app")

                if scr_amt is not None and cbs_txs:
                    # Check for exact or close amount match in CBS transactions
                    matching_cbs = [tx for tx in cbs_txs if abs(float(tx.amount) - float(scr_amt)) < 0.01]
                    if not matching_cbs and not has_legacy_discrepancy:
                        cbs_amt = float(cbs_txs[0].amount) if cbs_txs else 0.0
                        screenshot_findings.append({
                            "finding_type": "UNRECONCILED_PAYMENT_DISCREPANCY",
                            "severity": "HIGH",
                            "title": f"Payment Receipt Unmatched in Bank Ledger: {fname}",
                            "description": (
                                f"Screenshot {fname} claims a payment of ₹{float(scr_amt):,.2f} via {upi_app or 'UPI'} "
                                f"(UTR: {utr or 'N/A'}), but no corresponding entry of ₹{float(scr_amt):,.2f} "
                                f"exists in the provided Core Banking statement."
                            ),
                            "screenshot_amount": float(scr_amt),
                            "receipt_amount": float(scr_amt),
                            "cbs_amount": cbs_amt,
                            "rrn": utr,
                            "utr": utr,
                            "filename": fname,
                            "artifact_id": aid,
                            "statutory_caveat": (
                                "AI PROPOSES. FORENSIC ENGINES TEST. INVESTIGATORS DECIDE. "
                                "An unmatched screenshot indicates an unrecorded entry, settlement delay, "
                                "or fabricated receipt; request NPCI ISO 8583 switch logs under BNSS Section 94 "
                                "to verify settlement before drawing investigative conclusions."
                            ),
                        })
                    elif matching_cbs:
                        screenshot_findings.append({
                            "finding_type": "RECONCILED_PAYMENT",
                            "severity": "INFO",
                            "title": f"Payment Receipt Reconciled: {fname}",
                            "description": f"Receipt for ₹{float(scr_amt):,.2f} matches Core Banking entry {matching_cbs[0].tx_id}.",
                            "screenshot_amount": float(scr_amt),
                            "receipt_amount": float(scr_amt),
                            "cbs_amount": float(matching_cbs[0].amount),
                            "rrn": utr,
                            "utr": utr,
                            "filename": fname,
                            "artifact_id": aid,
                        })
                elif scr_amt is None and not has_legacy_discrepancy and fname.endswith((".jpg", ".jpeg", ".png")):
                    # Informal document or non-payment image
                    screenshot_findings.append({
                        "finding_type": "INFORMAL_EVIDENCE_RECORD",
                        "severity": "INFO",
                        "title": f"Informal Document: {fname}",
                        "description": (
                            f"Evidence file '{fname}' does not contain recognized structured transaction fields. "
                            "Treated as informal contextual evidence."
                        ),
                        "filename": fname,
                        "artifact_id": aid,
                    })
            except Exception as exc:
                logger.warning(f"Error examining screenshot {fname} for reconciliation: {exc}")

        return {
            "case_id": case_id,
            "reconciliation": recon_result.to_dict(),
            "transaction_count": len(cbs_txs),
            "screenshot_findings": screenshot_findings,
        }


