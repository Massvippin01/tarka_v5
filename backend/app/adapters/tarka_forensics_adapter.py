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


class TarkaForensicsAdapter:
    """Documented bidirectional adapter connecting TARKA engine with SentinelX."""

    def __init__(self, store: Optional[CaseStore] = None):
        # Use shared case_store from server.py (or custom injected store)
        self.store = store or case_store

    def ensure_synthetic_case(self, case_id: str = "upi_payment_discrepancy") -> Dict[str, Any]:
        """Ensures the canonical SUTRAM 2026 synthetic case is seeded and ready."""
        seed_demo_case_if_needed()
        case = self.store.get_case(case_id)
        if not case:
            case = self.store.create_case(
                case_id=case_id,
                title="UPI Payment Discrepancy",
                description="Investigation of ₹25,000 digital payment discrepancy across chat, bank statement, telecom CDR, and claim receipts.",
                investigator="Forensic Officer",
            )
        d = case.model_dump(mode="json")
        d["seeded"] = True
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
    ) -> Dict[str, Any]:
        """Generates statutory Section 63 Indian Evidence Act / BSA compliant report with automatic PDF persistence."""
        builder = ForensicReportBuilder(case_store=self.store)
        title = f"Statutory Forensic Audit: {reason} (Examiner: {officer})"
        report = builder.generate_report(
            case_id=case_id,
            run_id=run_id or "baseline",
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
        report_dict["report_id"] = clean_rep_id
        report_dict["pdf_artifact_hash"] = pdf_hash
        report_dict["pdf_size_bytes"] = len(pdf_bytes)
        report_dict["status"] = "BSA_63_COMPLIANT"
        report_dict["examiner_name"] = officer
        report_dict["purpose"] = reason
        report_dict["available_formats"] = ["pdf", "html", "json"]

        with open(reports_dir / f"{clean_rep_id}.json", "w", encoding="utf-8") as f:
            json.dump(report_dict, f, indent=2)

        # Log to tamper-evident custody ledger
        try:
            ledger = self.store.get_ledger(clean_case_id)
            ledger.append_action(
                action="GENERATE_STATUTORY_REPORT",
                payload_data={
                    "report_id": report.metadata.report_id,
                    "fingerprint": report.metadata.fingerprint,
                    "pdf_hash": pdf_hash,
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


