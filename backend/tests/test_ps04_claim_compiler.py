"""
Automated Test Suite for Workstream A1:
Forensic Claim Compiler, Typed Intermediate Representations, and Claim Dependency DAG.
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


class TestWorkstreamA1ClaimCompiler:
    """Test suite verifying Workstream A1 Claim Compiler."""

    def test_typed_evidence_and_claim_creation(self):
        """Verify typed evidence items and transaction claim compilation."""
        compiler = ForensicClaimCompiler()

        ev = EvidenceItem(
            artifact_id="ART-BANK-STATEMENT",
            source_type="BANK_LEDGER_PDF",
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            byte_offset_start=1024,
            byte_offset_end=2048,
            raw_snippet="NEFT-OUT / 14:15:00 / INR 50,000.00 / BENEFICIARY VIKRAM SHAH",
            acquisition_timestamp=1700000000.0,
            trust_tier=TrustTier.T1_HIGH,
            integrity_verified=True,
        )
        compiler.ingest_evidence_item(ev)

        txn = TransactionReference(
            txn_id="TX-50000",
            amount=50000.0,
            currency="INR",
            timestamp_epoch=1700000000.0,
            from_entity_id="ENT-VICTIM",
            to_entity_id="ENT-VIKRAM-SHAH",
            rrn_utr="UTR99887766",
        )

        claim = compiler.compile_transaction_claim(
            claim_id="CLM-TXN-01",
            txn=txn,
            supporting_artifact_id="ART-BANK-STATEMENT",
        )

        assert claim.claim_id == "CLM-TXN-01"
        assert claim.supporting_evidence_ids == ["ART-BANK-STATEMENT"]
        assert "INR 50000.00" in claim.statement

    def test_dag_acyclicity_enforcement(self):
        """Verify that attempting to add a circular dependency in the Claim DAG raises a ValueError."""
        dag = ClaimDependencyDAG()

        c1 = InvestigativeClaim("C1", "Claim 1", "Stmt 1", "T", ClaimState.NOT_EVALUATED)
        c2 = InvestigativeClaim("C2", "Claim 2", "Stmt 2", "T", ClaimState.NOT_EVALUATED, premise_claim_ids=["C1"])
        c3 = InvestigativeClaim("C3", "Claim 3", "Stmt 3", "T", ClaimState.NOT_EVALUATED, premise_claim_ids=["C2"])

        dag.add_claim(c1)
        dag.add_claim(c2)
        dag.add_claim(c3)

        # Now attempt to make C1 depend on C3 (creating C1 -> C2 -> C3 -> C1 cycle)
        c1_cyclic = InvestigativeClaim("C1", "Claim 1 Modified", "Stmt 1", "T", ClaimState.NOT_EVALUATED, premise_claim_ids=["C3"])
        with pytest.raises(ValueError, match="Circular dependency detected"):
            dag.add_claim(c1_cyclic)

    def test_5_state_claim_evaluation_rules(self):
        """
        Verify the 5 formal claim evaluation states:
        SUPPORTED, CONTRADICTED, UNCERTAIN, UNSUPPORTED, NOT_EVALUATED.
        """
        dag = ClaimDependencyDAG()

        # Ingest valid evidence item
        ev_good = EvidenceItem("ART-GOOD", "TXT", "h1", 0, 10, "good", 1.0, TrustTier.T1_HIGH, integrity_verified=True)
        # Ingest tampered evidence item
        ev_bad = EvidenceItem("ART-BAD", "TXT", "h2", 0, 10, "tampered", 1.0, TrustTier.T3_LOW, integrity_verified=False)

        dag.add_evidence(ev_good)
        dag.add_evidence(ev_bad)

        # 1. Supported claim: supported by valid evidence
        c_sup = InvestigativeClaim("C_SUP", "Title", "Stmt", "T", ClaimState.NOT_EVALUATED, supporting_evidence_ids=["ART-GOOD"])
        dag.add_claim(c_sup)

        # 2. Unsupported claim: supported only by tampered/corrupt evidence
        c_unsup = InvestigativeClaim("C_UNSUP", "Title", "Stmt", "T", ClaimState.NOT_EVALUATED, supporting_evidence_ids=["ART-BAD"])
        dag.add_claim(c_unsup)

        # 3. Contradicted claim: has explicit contradicting evidence
        c_contra = InvestigativeClaim(
            "C_CONTRA", "Title", "Stmt", "T", ClaimState.NOT_EVALUATED,
            supporting_evidence_ids=["ART-GOOD"],
            contradicting_evidence_ids=["ART-BAD"]
        )
        dag.add_claim(c_contra)

        # 4. Uncertain claim: depends on an unsupported premise
        c_uncert = InvestigativeClaim(
            "C_UNCERT", "Title", "Stmt", "T", ClaimState.NOT_EVALUATED,
            supporting_evidence_ids=["ART-GOOD"],
            premise_claim_ids=["C_UNSUP"]
        )
        dag.add_claim(c_uncert)

        dag.evaluate_all()

        assert dag.get_claim("C_SUP").evaluation_status == ClaimState.SUPPORTED
        assert dag.get_claim("C_UNSUP").evaluation_status == ClaimState.UNSUPPORTED
        assert dag.get_claim("C_CONTRA").evaluation_status == ClaimState.CONTRADICTED
        assert dag.get_claim("C_UNCERT").evaluation_status == ClaimState.UNCERTAIN

    def test_cgnat_safeguard_attribution_claim(self):
        """Verify that shared CGNAT pool triggers INSUFFICIENT_EVIDENCE / UNCERTAIN status."""
        compiler = ForensicClaimCompiler()

        ev = EvidenceItem("ART-AIRTEL-IPDR", "IPDR_LOG", "hash", 0, 100, "182.74.15.22", 1.0, TrustTier.T1_HIGH)
        compiler.ingest_evidence_item(ev)

        # Compile attribution with CGNAT 340-to-1 active
        claim = compiler.compile_attribution_claim(
            claim_id="CLM-DEEPAK-MEENA",
            entity_name="Deepak Meena",
            role="Mule Account Operator",
            premise_claim_ids=[],
            supporting_artifact_ids=["ART-AIRTEL-IPDR"],
            cgnat_shared_pool=True,
        )

        assert "CGNAT SAFEGUARD ACTIVE" in claim.limitations[1]
        assert claim.confidence_score == 0.50

    def test_explainable_brief_generation(self):
        """Verify the compiler generates a structured 7-question explainable brief."""
        compiler = ForensicClaimCompiler()
        ev = EvidenceItem("ART-01", "PDF", "h", 0, 10, "data", 1.0, TrustTier.T1_HIGH)
        compiler.ingest_evidence_item(ev)

        txn = TransactionReference("TX-1", 1000.0, "INR", 1.0, "A", "B")
        compiler.compile_transaction_claim("C1", txn, "ART-01")

        brief = compiler.build_explainable_brief()
        assert brief["total_claims"] == 1
        assert brief["supported_count"] == 1
        assert "Section 63 Bharatiya Sakshya Adhiniyam" in brief["statutory_declaration"]

    def test_zkp_claim_linkage_and_metadata(self):
        """Verify transaction claims can bind to cryptographic Zero-Knowledge Proofs."""
        compiler = ForensicClaimCompiler()
        ev = EvidenceItem("ART-BANK-01", "PDF", "hash1", 0, 50, "statement snippet", 1.0, TrustTier.T1_HIGH)
        compiler.ingest_evidence_item(ev)

        txn = TransactionReference("TX-REG-01", 75000.0, "INR", 1700000000.0, "ENT-SRC", "ENT-DST")
        claim = compiler.compile_transaction_claim(
            claim_id="CLM-TXN-ZKP-01",
            txn=txn,
            supporting_artifact_id="ART-BANK-01",
            zkp_proof_id="ZKP-8812A4F9",
        )

        assert claim.zkp_proof_id == "ZKP-8812A4F9"
        assert any("ZKP proof ZKP-8812A4F9" in assump for assump in claim.assumptions)
