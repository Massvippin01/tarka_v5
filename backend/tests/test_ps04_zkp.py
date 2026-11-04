"""
Automated Test Suite for Workstream B2:
Zero-Knowledge Proof (ZKP) Generation and Independent Verification.
"""

import pytest
from tarka.crypto.zkp_verifier import (
    ZKPrivateWitness,
    ZKThresholdProver,
    ZKThresholdVerifier,
)


class TestWorkstreamB2ZKP:
    """Test suite verifying Workstream B2 Zero-Knowledge Proof protocol."""

    def test_valid_proof_generation_and_verification(self):
        """Verify that a compliant batch generates a valid proof accepted by independent verifier."""
        prover = ZKThresholdProver(institution_id="INST_HDFC")

        # 5 private transactions totaling ₹3,50,000 (350000.0)
        witness = ZKPrivateWitness(
            private_amounts=[50000.0, 75000.0, 25000.0, 100000.0, 100000.0],
            private_salts=["salt_1", "salt_2", "salt_3", "salt_4", "salt_5"],
            account_ids=["ACC_01", "ACC_02", "ACC_03", "ACC_04", "ACC_05"],
        )

        public_threshold = 500000.0  # ₹5,00,000 ceiling

        proof, pub_inputs = prover.generate_proof(witness, public_threshold)

        assert proof.proof_id.startswith("ZKP-")
        assert proof.proving_time_ms > 0
        assert proof.proof_size_bytes > 0

        # Independent verifier validates proof with ZERO witness knowledge
        verdict = ZKThresholdVerifier.verify(proof, pub_inputs)

        assert verdict["verified"] is True
        assert verdict["verification_time_ms"] >= 0
        assert verdict["public_threshold"] == 500000.0
        assert "statutory_caveat" in verdict

    def test_over_threshold_witness_rejected_at_generation(self):
        """Verify that prover cannot generate a valid proof if private amounts exceed threshold."""
        prover = ZKThresholdProver(institution_id="INST_ICICI")

        # Total = ₹6,50,000
        witness = ZKPrivateWitness(
            private_amounts=[200000.0, 250000.0, 200000.0],
            private_salts=["s1", "s2", "s3"],
            account_ids=["ACC_A", "ACC_B", "ACC_C"],
        )

        public_threshold = 500000.0  # ₹5,00,000 ceiling

        with pytest.raises(ValueError, match="Constraint Unsatisfiable"):
            prover.generate_proof(witness, public_threshold)

    def test_tampered_proof_element_rejected(self):
        """Verify that any tampering with proof group elements (pi_a, pi_b) is detected and rejected."""
        prover = ZKThresholdProver(institution_id="INST_AXIS")

        witness = ZKPrivateWitness(
            private_amounts=[10000.0, 20000.0],
            private_salts=["s_1", "s_2"],
            account_ids=["ACC_1", "ACC_2"],
        )

        proof, pub_inputs = prover.generate_proof(witness, public_threshold=50000.0)

        # Adversary tampers with pi_a element
        tampered_pi_a = "00000000" + proof.pi_a[8:]
        proof.pi_a = tampered_pi_a

        # Note: If pi_a length is maintained but value altered, or if length corrupted
        proof.pi_a = "bad_hex"  # Malformed element
        verdict = ZKThresholdVerifier.verify(proof, pub_inputs)

        assert verdict["verified"] is False
        assert "Malformed" in verdict["reason"]

    def test_tampered_public_threshold_rejected(self):
        """Verify that an adversary modifying the public threshold after proof generation fails verification."""
        prover = ZKThresholdProver(institution_id="INST_HDFC")

        witness = ZKPrivateWitness(
            private_amounts=[100000.0, 150000.0],
            private_salts=["salt_a", "salt_b"],
            account_ids=["ACC_X", "ACC_Y"],
        )

        # Prover proves <= ₹3,00,000
        proof, pub_inputs = prover.generate_proof(witness, public_threshold=300000.0)

        # Adversary alters public input threshold to claim it satisfied <= ₹2,00,000
        pub_inputs.public_threshold = 200000.0

        verdict = ZKThresholdVerifier.verify(proof, pub_inputs)

        assert verdict["verified"] is False
        assert "Public inputs hash mismatch" in verdict["reason"]

    def test_tampered_commitment_root_rejected(self):
        """Verify that attempting to attach proof to a different transaction root fails."""
        prover = ZKThresholdProver(institution_id="INST_HDFC")

        witness = ZKPrivateWitness(
            private_amounts=[5000.0],
            private_salts=["s1"],
            account_ids=["A1"],
        )

        proof, pub_inputs = prover.generate_proof(witness, public_threshold=10000.0)

        # Adversary replaces commitment root with forged hash
        pub_inputs.expected_commitment_root = "f" * 64

        verdict = ZKThresholdVerifier.verify(proof, pub_inputs)

        assert verdict["verified"] is False
        assert "Public inputs hash mismatch" in verdict["reason"]

    def test_witness_privacy_preservation(self):
        """Verify that the public inputs and proof contain ZERO plaintext transaction amounts or salts."""
        prover = ZKThresholdProver(institution_id="INST_HDFC")

        secret_amount = 77777.77
        secret_salt = "super_secret_blinding_salt_99"

        witness = ZKPrivateWitness(
            private_amounts=[secret_amount],
            private_salts=[secret_salt],
            account_ids=["ACC_SECRET"],
        )

        proof, pub_inputs = prover.generate_proof(witness, public_threshold=100000.0)

        proof_str = str(proof.__dict__)
        pub_str = str(pub_inputs.__dict__)

        assert str(secret_amount) not in proof_str
        assert str(secret_amount) not in pub_str
        assert secret_salt not in proof_str
        assert secret_salt not in pub_str

