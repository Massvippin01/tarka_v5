"""
Automated Test Suite for Workstream A2:
Formal SMT Verification of Financial Invariants, Kinematic Limits, and Causality using Microsoft Z3.
"""

import pytest
from tarka.claim_compiler.formal_verifier import FormalSMTVerifier


class TestWorkstreamA2FormalVerification:
    """Test suite verifying Workstream A2 Z3 Formal Verification."""

    def test_financial_conservation_valid(self):
        """Verify Z3 proves financial balance conservation when debits/credits match exactly."""
        # Initial: 1,00,000, Inflows: 50,000 + 25,000, Outflows: 40,000 + 10,000. Expected final: 1,25,000
        result = FormalSMTVerifier.verify_financial_conservation(
            initial_balance=100000.0,
            inflows=[50000.0, 25000.0],
            outflows=[40000.0, 10000.0],
            final_balance=125000.0,
        )

        assert result["invariant_satisfied"] is True
        assert "SAT" in result["solver_verdict"]
        assert result["reconciliation_discrepancy"] == 0.0

    def test_financial_conservation_violation_counterexample(self):
        """Verify Z3 proves financial violation and extracts exact counterexample discrepancy."""
        # Final balance is claimed to be 1,50,000 (discrepancy of 25,000 unaccounted funds)
        result = FormalSMTVerifier.verify_financial_conservation(
            initial_balance=100000.0,
            inflows=[50000.0],
            outflows=[25000.0],
            final_balance=150000.0,  # Should be 125,000!
        )

        assert result["invariant_satisfied"] is False
        assert "UNSAT" in result["solver_verdict"]
        assert result["reconciliation_discrepancy"] == 25000.0
        assert "counterexample" in result

    def test_kinematic_feasibility_feasible_commute(self):
        """Verify feasible terrestrial commute between Delhi and Noida (25 km in 45 minutes = ~33 km/h)."""
        # Delhi: (28.6139, 77.2090), Noida: (28.5355, 77.3910)
        t1 = 1700000000.0
        t2 = t1 + (45 * 60)  # 45 minutes later

        result = FormalSMTVerifier.verify_kinematic_feasibility(
            loc1_lat=28.6139,
            loc1_lon=77.2090,
            time1_epoch=t1,
            loc2_lat=28.5355,
            loc2_lon=77.3910,
            time2_epoch=t2,
            max_speed_kmh=140.0,
        )

        assert result["feasible"] is True
        assert "SAT" in result["solver_verdict"]
        assert result["minimum_required_speed_kmh"] < 60.0

    def test_kinematic_feasibility_physical_impossibility(self):
        """
        Verify physical impossibility: Jaipur to Noida (240 km in 14 minutes = 1,028 km/h).
        Exceeds express highway limits (>140 km/h) and supersonic commercial jet limits.
        """
        # Jaipur: (26.9124, 75.7873), Noida: (28.5355, 77.3910) ~235 km
        t1 = 1700000000.0
        t2 = t1 + (14 * 60)  # Only 14 minutes later!

        result = FormalSMTVerifier.verify_kinematic_feasibility(
            loc1_lat=26.9124,
            loc1_lon=75.7873,
            time1_epoch=t1,
            loc2_lat=28.5355,
            loc2_lon=77.3910,
            time2_epoch=t2,
            max_speed_kmh=140.0,
        )

        assert result["feasible"] is False
        assert "UNSAT" in result["solver_verdict"]
        assert result["minimum_required_speed_kmh"] > 700.0
        assert "Physical Kinematic Impossibility" in result["solver_verdict"]
        assert "counterexample" in result
        assert "statutory_caveat" in result

    def test_temporal_causality_chronological_inversion(self):
        """Verify detection of chronological inversion (effect claimed before cause)."""
        t_cause = 1700001000.0
        t_effect_inverted = 1700000500.0  # 500 seconds earlier than cause

        result = FormalSMTVerifier.verify_temporal_causality(
            cause_event_name="FUNDS_DISPATCHED_NPCI",
            cause_epoch=t_cause,
            effect_event_name="ATM_CASH_DISPENSED",
            effect_epoch=t_effect_inverted,
            skew_tolerance_sec=30.0,
        )

        assert result["causality_valid"] is False
        assert "UNSAT" in result["solver_verdict"]
        assert "Chronological Inversion" in result["solver_verdict"]

    def test_identity_preconditions_and_non_guilt_disclaimer(self):
        """Verify identity contradiction verification, counterexample extraction, and non-guilt disclaimers."""
        # 1. Matching identities
        res_valid = FormalSMTVerifier.verify_identity_preconditions(
            subject_id="SUBJ-001",
            observed_identifiers={"pan": "ABCDE1234F", "msisdn": "+919876543210"},
            known_anchor_identifiers={"pan": "ABCDE1234F", "msisdn": "+919876543210"},
        )
        assert res_valid["preconditions_satisfied"] is True
        assert "SAT" in res_valid["solver_verdict"]
        assert "NON-GUILT LEGAL DISCLAIMER" in res_valid["non_guilt_disclaimer"]

        # 2. Conflicting PAN -> UNSAT
        res_conflict = FormalSMTVerifier.verify_identity_preconditions(
            subject_id="SUBJ-002",
            observed_identifiers={"pan": "ABCDE1234F", "msisdn": "+919876543210"},
            known_anchor_identifiers={"pan": "XYZPK9876Q", "msisdn": "+919876543210"},
        )
        assert res_conflict["preconditions_satisfied"] is False
        assert "UNSAT" in res_conflict["solver_verdict"]
        assert "Hard identifier conflict on 'pan'" in res_conflict["counterexample"]
        assert "NON-GUILT LEGAL DISCLAIMER" in res_conflict["non_guilt_disclaimer"]


