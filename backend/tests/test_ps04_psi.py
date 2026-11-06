"""
Automated Test Suite for Workstream B1:
Privacy-Preserving Institutional Correlation (ECDH-PSI).
"""

import pytest
from tarka.privacy.psi import (
    IdentifierType,
    InstitutionConfig,
    InstitutionNode,
    PSICoordinator,
    create_synthetic_institutions,
    normalize_identifier,
    point_mul,
    hash_to_curve,
    ORDER_N,
)


class TestWorkstreamB1PSI:
    """Test suite verifying Workstream B1 Private Set Intersection."""

    def test_elliptic_curve_ecdh_commutativity(self):
        """Verify mathematical commutativity of double-scalar multiplication on SECP256k1."""
        test_id = "+919876543210"
        pt = hash_to_curve(test_id)

        k_A = 0xABCDEF123456789
        k_B = 0x987654321FEDCBA

        pt_AB = point_mul(point_mul(pt, k_A), k_B)
        pt_BA = point_mul(point_mul(pt, k_B), k_A)

        assert pt_AB is not None
        assert pt_BA is not None
        assert pt_AB == pt_BA, "ECDH commutativity failure: k_B*(k_A*H(x)) != k_A*(k_B*H(x))"

    def test_canonical_identifier_normalization(self):
        """Verify normalizers handle whitespace, casing, missing country codes, and punctuation."""
        # Phone numbers
        assert normalize_identifier("9876543210", IdentifierType.MSISDN) == "+919876543210"
        assert normalize_identifier("  +91 98765-43210 ", IdentifierType.MSISDN) == "+919876543210"
        assert normalize_identifier("919876543210", IdentifierType.MSISDN) == "+919876543210"

        # PAN cards
        assert normalize_identifier(" bzcpk8812m ", IdentifierType.PAN) == "BZCPK8812M"
        assert normalize_identifier("BZCPK-8812-M", IdentifierType.PAN) == "BZCPK8812M"

        # UPI VPAs
        assert normalize_identifier("Mule_User@OkHDFCBank ", IdentifierType.UPI_VPA) == "mule_user@okhdfcbank"

        # Bank accounts
        assert normalize_identifier("hdfc 0001 2345 67", IdentifierType.BANK_ACCOUNT) == "HDFC0001234567"

    def test_pairwise_psi_successful_match(self):
        """Verify 2-party PSI finds known mule intersection between Bank A and Bank B without data leakage."""
        coord, node_a, node_b, node_c = create_synthetic_institutions()

        result = coord.execute_pairwise_psi(
            requester_id="INST_HDFC",
            target_id="INST_ICICI",
            id_type=IdentifierType.MSISDN,
            auth_token="TOKEN_HDFC_SECURE_991823",
            scope="CYBER_FRAUD_INVESTIGATION",
        )

        assert result["success"] is True
        assert result["intersection_size"] == 1
        assert "+919876543210" in result["matched_identifiers"]

        # Ensure non-overlapping legitimate accounts from Bank B are NOT in results
        assert "+918888000001" not in result["matched_identifiers"]
        assert "+918888000002" not in result["matched_identifiers"]

    def test_tripartite_psi_three_way_match(self):
        """Verify 3-way intersection across HDFC, ICICI, and AXIS."""
        coord, node_a, node_b, node_c = create_synthetic_institutions()

        result = coord.execute_tripartite_psi(
            requester_id="INST_HDFC",
            partner_ids=["INST_ICICI", "INST_AXIS"],
            id_type=IdentifierType.PAN,
            auth_token="TOKEN_HDFC_SECURE_991823",
            scope="CYBER_FRAUD_INVESTIGATION",
        )

        assert result["success"] is True
        assert result["three_way_intersection_size"] == 1
        assert "BZCPK8812M" in result["matched_identifiers"]

    def test_disjoint_datasets_yield_zero_matches(self):
        """Verify that disjoint sets produce zero false positives."""
        coord = PSICoordinator()

        cfg1 = InstitutionConfig("INST_1", "Bank 1", "IN", {"SCOPED"}, "TOK_1")
        cfg2 = InstitutionConfig("INST_2", "Bank 2", "IN", {"SCOPED"}, "TOK_2")

        n1 = InstitutionNode(cfg1)
        n2 = InstitutionNode(cfg2)

        n1.add_records(IdentifierType.MSISDN, ["+919999111111", "+919999222222"])
        n2.add_records(IdentifierType.MSISDN, ["+918888333333", "+918888444444"])

        coord.register_institution(n1)
        coord.register_institution(n2)

        result = coord.execute_pairwise_psi("INST_1", "INST_2", IdentifierType.MSISDN, "TOK_1", "SCOPED")
        assert result["success"] is True
        assert result["intersection_size"] == 0
        assert result["matched_identifiers"] == []

    def test_unauthorized_token_rejection(self):
        """Verify unauthorized queries with invalid tokens fail closed."""
        coord, node_a, node_b, node_c = create_synthetic_institutions()

        result = coord.execute_pairwise_psi(
            requester_id="INST_HDFC",
            target_id="INST_ICICI",
            id_type=IdentifierType.MSISDN,
            auth_token="WRONG_INVALID_TOKEN",
            scope="CYBER_FRAUD_INVESTIGATION",
        )

        assert result["success"] is False
        assert "Unauthorized" in result["error"]

    def test_unauthorized_scope_rejection(self):
        """Verify queries with unpermitted scopes are rejected."""
        coord, node_a, node_b, node_c = create_synthetic_institutions()

        result = coord.execute_pairwise_psi(
            requester_id="INST_ICICI",
            target_id="INST_HDFC",
            id_type=IdentifierType.MSISDN,
            auth_token="TOKEN_ICICI_SECURE_774102",
            scope="UNAPPROVED_MARKETING_SCOPE",
        )

        assert result["success"] is False
        assert "not permitted" in result["error"]

    def test_duplicate_identifier_handling(self):
        """Verify duplicate additions are deduplicated without inflating intersection size."""
        coord = PSICoordinator()
        cfg1 = InstitutionConfig("INST_A", "Bank A", "IN", {"SCOPED"}, "TOK_A")
        cfg2 = InstitutionConfig("INST_B", "Bank B", "IN", {"SCOPED"}, "TOK_B")

        n1 = InstitutionNode(cfg1)
        n2 = InstitutionNode(cfg2)

        # Add duplicate phone numbers multiple times
        n1.add_records(IdentifierType.MSISDN, ["+919876543210", "+919876543210", "9876543210"])
        n2.add_records(IdentifierType.MSISDN, ["+919876543210", "  +91 9876543210  "])

        coord.register_institution(n1)
        coord.register_institution(n2)

        result = coord.execute_pairwise_psi("INST_A", "INST_B", IdentifierType.MSISDN, "TOK_A", "SCOPED")
        assert result["success"] is True
        assert result["intersection_size"] == 1
        assert result["matched_identifiers"] == ["+919876543210"]

    def test_audit_trail_recorded(self):
        """Verify that every query is recorded immutably in the audit ledger."""
        coord, node_a, node_b, node_c = create_synthetic_institutions()

        coord.execute_pairwise_psi(
            requester_id="INST_HDFC",
            target_id="INST_ICICI",
            id_type=IdentifierType.MSISDN,
            auth_token="TOKEN_HDFC_SECURE_991823",
            scope="CYBER_FRAUD_INVESTIGATION",
        )

        trail = coord.get_audit_trail()
        assert len(trail) >= 1
        last = trail[-1]
        assert last["requester"] == "INST_HDFC"
        assert last["targets"] == ["INST_ICICI"]
        assert last["authorized"] is True
        assert last["intersection_size"] == 1

    def test_cardinality_padding_power_of_two_bucket_def_001(self):
        """Verify DEF-001 mitigation: power-of-two bucket padding hides raw dataset size."""
        coord = PSICoordinator()
        cfg_a = InstitutionConfig("INST_A", "Bank A", "IN", {"INVESTIGATION"}, "TOK_A")
        cfg_b = InstitutionConfig("INST_B", "Bank B", "IN", {"INVESTIGATION"}, "TOK_B")

        n_a = InstitutionNode(cfg_a)
        n_b = InstitutionNode(cfg_b)

        # Node A has 3 items (padded to 4 = 2^2)
        n_a.add_records(IdentifierType.MSISDN, ["+919000000001", "+919000000002", "+919876543210"])
        # Node B has 2 items (padded to 4 = 2^2)
        n_b.add_records(IdentifierType.MSISDN, ["+918000000001", "+919876543210"])

        coord.register_institution(n_a)
        coord.register_institution(n_b)

        result = coord.execute_pairwise_psi(
            "INST_A",
            "INST_B",
            IdentifierType.MSISDN,
            "TOK_A",
            "INVESTIGATION",
            pad_power_of_two=True,
        )

        assert result["success"] is True
        assert result["cardinality_padding_applied"] is True
        # Wire size should be padded to 4
        assert result["padded_wire_cardinalities"]["requester_wire_size"] == 4
        assert result["padded_wire_cardinalities"]["target_wire_size"] == 4
        # Exactly the 1 true match is discovered; zero dummy elements leaked
        assert result["intersection_size"] == 1
        assert result["matched_identifiers"] == ["+919876543210"]
        for m in result["matched_identifiers"]:
            assert not m.startswith("__TARKA_DUMMY_PSI_PAD_")

    def test_unpadded_mode_exact_wire_size(self):
        """Verify unpadded mode delivers exact wire cardinalities when explicitly requested."""
        coord = PSICoordinator()
        cfg_a = InstitutionConfig("INST_A", "Bank A", "IN", {"INVESTIGATION"}, "TOK_A")
        cfg_b = InstitutionConfig("INST_B", "Bank B", "IN", {"INVESTIGATION"}, "TOK_B")

        n_a = InstitutionNode(cfg_a)
        n_b = InstitutionNode(cfg_b)

        n_a.add_records(IdentifierType.PAN, ["ABCDE1111A", "ABCDE2222B", "BZCPK8812M"])
        n_b.add_records(IdentifierType.PAN, ["BZCPK8812M"])

        coord.register_institution(n_a)
        coord.register_institution(n_b)

        result = coord.execute_pairwise_psi(
            "INST_A",
            "INST_B",
            IdentifierType.PAN,
            "TOK_A",
            "INVESTIGATION",
            pad_power_of_two=False,
        )

        assert result["success"] is True
        assert result["cardinality_padding_applied"] is False
        assert result["padded_wire_cardinalities"]["requester_wire_size"] == 3
        assert result["padded_wire_cardinalities"]["target_wire_size"] == 1
        assert result["intersection_size"] == 1
        assert result["matched_identifiers"] == ["BZCPK8812M"]
