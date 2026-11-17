"""
Automated Test Suite for Workstream A3:
Counterfactual Impact Analysis and Controlled Evidence Exclusion.
"""

import pytest
from tarka.claim_compiler.compiler import (
    ClaimDependencyDAG,
    ClaimState,
    EvidenceItem,
    ForensicClaimCompiler,
    InvestigativeClaim,
    TransactionReference,
    TrustTier,
)
from tarka.claim_compiler.counterfactual import CounterfactualEngine


class TestWorkstreamA3Counterfactual:
    """Test suite verifying Workstream A3 Counterfactual Impact Analysis."""

    def test_single_artifact_exclusion_deactivation(self):
        """
        Verify that excluding an uncorroborated artifact deactivates only dependent claims
        while preserving independently corroborated findings.
        """
        dag = ClaimDependencyDAG()

        # Artifact 1: Disputed smartphone screenshot (unverified OCR)
        art1 = EvidenceItem("ART-SCREENSHOT", "OCR", "hash1", 0, 10, "pay 15000", 1.0, TrustTier.T3_LOW)
        # Artifact 2: Core Finacle banking switch log (verified)
        art2 = EvidenceItem("ART-FINACLE-LOG", "CORE_SWITCH", "hash2", 0, 10, "pay 2500", 1.0, TrustTier.T1_HIGH)
        # Artifact 3: Airtel BTS CDR log (independent location corroboration)
        art3 = EvidenceItem("ART-AIRTEL-CDR", "CDR", "hash3", 0, 10, "tower 402", 1.0, TrustTier.T1_HIGH)

        dag.add_evidence(art1)
        dag.add_evidence(art2)
        dag.add_evidence(art3)

        # Claim 1: Disputed payment claim (supported ONLY by screenshot)
        c1 = InvestigativeClaim(
            claim_id="CLM-DISPUTED-PAYMENT",
            title="Disputed Payment of 15k",
            statement="Complainant sent 15,000",
            claim_type="CLAIM",
            evaluation_status=ClaimState.NOT_EVALUATED,
            supporting_evidence_ids=["ART-SCREENSHOT"],
        )

        # Claim 2: Legitimate bank transfer (supported ONLY by Finacle)
        c2 = InvestigativeClaim(
            claim_id="CLM-FINACLE-DEBIT",
            title="Actual Bank Debit of 2.5k",
            statement="Bank debited 2,500",
            claim_type="TRANSACTION",
            evaluation_status=ClaimState.NOT_EVALUATED,
            supporting_evidence_ids=["ART-FINACLE-LOG"],
        )

        # Claim 3: Corroborated cell tower presence (supported by BOTH Finacle and Airtel CDR)
        c3 = InvestigativeClaim(
            claim_id="CLM-CELL-PRESENCE",
            title="Physical Presence Near Tower 402",
            statement="Device active near tower",
            claim_type="PRESENCE",
            evaluation_status=ClaimState.NOT_EVALUATED,
            supporting_evidence_ids=["ART-FINACLE-LOG", "ART-AIRTEL-CDR"],
        )

        # Claim 4: Amount mismatch contradiction (arises because screenshot contradicts bank log)
        c4 = InvestigativeClaim(
            claim_id="CLM-AMOUNT-MISMATCH",
            title="Amount Discrepancy",
            statement="Screenshot claims 15k but bank recorded 2.5k",
            claim_type="CONTRADICTION",
            evaluation_status=ClaimState.NOT_EVALUATED,
            supporting_evidence_ids=["ART-FINACLE-LOG"],
            contradicting_evidence_ids=["ART-SCREENSHOT"],
        )

        dag.add_claim(c1)
        dag.add_claim(c2)
        dag.add_claim(c3)
        dag.add_claim(c4)
        dag.evaluate_all()

        assert dag.get_claim("CLM-DISPUTED-PAYMENT").evaluation_status == ClaimState.SUPPORTED
        assert dag.get_claim("CLM-FINACLE-DEBIT").evaluation_status == ClaimState.SUPPORTED
        assert dag.get_claim("CLM-CELL-PRESENCE").evaluation_status == ClaimState.SUPPORTED
        assert dag.get_claim("CLM-AMOUNT-MISMATCH").evaluation_status == ClaimState.CONTRADICTED

        # Now simulate exclusion of ART-SCREENSHOT
        cf_engine = CounterfactualEngine(dag)
        report = cf_engine.simulate_evidence_exclusion("ART-SCREENSHOT")

        # 1. Claim 1 is deactivated (dissolved)
        deactivated_ids = [d["claim_id"] for d in report["deactivated_claims"]]
        assert "CLM-DISPUTED-PAYMENT" in deactivated_ids

        # 2. Contradiction 4 dissolves
        dissolved_ids = [d["claim_id"] for d in report["dissolved_contradictions"]]
        assert "CLM-AMOUNT-MISMATCH" in dissolved_ids

        # 3. Claims 2 and 3 survive because they have independent evidence!
        surviving_ids = [s["claim_id"] for s in report["surviving_claims"]]
        assert "CLM-FINACLE-DEBIT" in surviving_ids
        assert "CLM-CELL-PRESENCE" in surviving_ids

    def test_transitive_dependency_propagation(self):
        """Verify that excluding a root evidence item transitively invalidates a downstream inference chain."""
        dag = ClaimDependencyDAG()

        ev_root = EvidenceItem("ART-ROOT", "DOC", "hash_root", 0, 10, "raw root", 1.0, TrustTier.T1_HIGH)
        dag.add_evidence(ev_root)

        # C1 -> C2 -> C3
        c1 = InvestigativeClaim("C1", "Root Claim", "S1", "T", ClaimState.NOT_EVALUATED, supporting_evidence_ids=["ART-ROOT"])
        c2 = InvestigativeClaim("C2", "Intermediate Claim", "S2", "T", ClaimState.NOT_EVALUATED, premise_claim_ids=["C1"])
        c3 = InvestigativeClaim("C3", "Final Attribution Claim", "S3", "T", ClaimState.NOT_EVALUATED, premise_claim_ids=["C2"])

        dag.add_claim(c1)
        dag.add_claim(c2)
        dag.add_claim(c3)
        dag.evaluate_all()

        assert dag.get_claim("C3").evaluation_status == ClaimState.SUPPORTED

        cf_engine = CounterfactualEngine(dag)
        report = cf_engine.simulate_evidence_exclusion("ART-ROOT")

        assert "C1" in report["directly_affected_claim_ids"]
        assert "C2" in report["transitively_affected_claim_ids"]
        assert "C3" in report["transitively_affected_claim_ids"]

