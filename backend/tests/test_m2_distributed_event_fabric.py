"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
M2 ACCEPTANCE TEST SUITE: DISTRIBUTED EVENT FABRIC, VECTOR CLOCKS, PBFT, & CLAIM BRIDGE

Covers all formal M2 criteria:
1. Event schema validation against CanonicalInstitutionEvent contract.
2. Event immutability and cryptographic SHA-256 chain integrity.
3. Idempotent deduplication of duplicate transmissions.
4. Out-of-order event detection and handling.
5. Delayed event handling and causal dependency buffering.
6. Vector clock comparisons: happened-before, happened-after, concurrent, identical, undefined.
7. Concurrent events without forcing artificial total order.
8. Detection of missing causal dependencies.
9. Multi-tenant institution access isolation.
10. Event stream deterministic replay.
11. Four-validator PBFT normal consensus agreement (quorum 3).
12. PBFT resilience against 1 silent / crashed validator.
13. PBFT resilience against 1 Byzantine validator with conflicting digests.
14. PBFT leader failure and view change election of backup leader.
15. PBFT duplicate message and network delay resilience.
16. PBFT network partition behavior (2x2 split blocks, heal resumes).
17. Integration with Claim Compiler and Z3 formal verifier (ClaimRecomputationBridge).
18. Audit log integrity and tamper detection.
"""

import hashlib
import json
import pytest
from tarka.contracts.canonical_v1 import (
    CanonicalClaim,
    CanonicalInstitutionEvent,
    ClaimState,
    ClaimType,
    InstitutionEventType,
)
from tarka.distributed import (
    CausalEvent,
    CausalRelation,
    ClaimRecomputationBridge,
    DistributedEventFabric,
    EventEnvelope,
    EventStatus,
    EventType,
    PBFTConsensusNetwork,
    PBFTPhase,
    TemporalConsistencyEngine,
    VectorClock,
    create_canonical_institution_event,
    create_event,
)


class TestM2DistributedEventFabric:
    """M2 Comprehensive Acceptance and Adversarial Test Suite."""

    # --------------------------------------------------------------------------
    # 1. Event Schema Validation against Canonical Contracts
    # --------------------------------------------------------------------------
    def test_01_canonical_event_contract_validation(self):
        canon_evt = create_canonical_institution_event(
            event_id="EVT_CANON_001",
            institution_id="HDFC_BANK",
            event_type=InstitutionEventType.TRANSACTION_FLAGGED,
            sequence_number=1,
            correlation_id="CASE_2026_01",
            idempotency_key="IDEMP_001",
            payload={"account": "HDFC_1234", "flag_reason": "VELOCITY_EXCEEDED"},
            lamport_ts=1,
            vector_clock={"HDFC_BANK": 1}
        )

        assert isinstance(canon_evt, CanonicalInstitutionEvent)
        assert canon_evt.schema_version == "v1.0.0"
        assert len(canon_evt.payload_commitment) == 64
        assert canon_evt.causality_metadata.lamport_ts == 1
        assert canon_evt.causality_metadata.vector_clock["HDFC_BANK"] == 1

        # Test bidirectional conversion to EventEnvelope
        env = EventEnvelope.from_canonical(canon_evt)
        assert env.event_id == canon_evt.event_id
        assert env.event_type == EventType.TRANSACTION_FLAGGED

        roundtrip_canon = env.to_canonical()
        assert roundtrip_canon.event_id == canon_evt.event_id
        assert roundtrip_canon.payload_commitment == canon_evt.payload_commitment

    # --------------------------------------------------------------------------
    # 2. Event Immutability & Cryptographic Hash Chaining
    # --------------------------------------------------------------------------
    def test_02_ledger_cryptographic_hash_chain(self):
        fabric = DistributedEventFabric()

        for seq in range(1, 4):
            evt = create_event(
                event_id=f"EVT_CHAIN_{seq}",
                issuer_id="OFFICER_A",
                institution_id="SBI_BANK",
                event_type=EventType.EVIDENCE_INGESTED,
                sequence_number=seq,
                correlation_id="CASE_CHAIN_TEST",
                idempotency_key=f"IDEMP_CHAIN_{seq}",
                payload={"file": f"exhibit_{seq}.csv", "seq": seq},
            )
            res = fabric.append_event(evt)
            assert res["status"] == "COMMITTED"

        # Verify chain integrity
        valid, err = fabric.verify_ledger_chain_integrity()
        assert valid is True
        assert err is None

        # Verify that tampered chain reference is caught
        committed = fabric.get_committed_events()
        committed[2].prior_event_reference = "MALICIOUS_TAMPERED_HASH"
        valid_tampered, err_tampered = fabric.verify_ledger_chain_integrity()
        assert valid_tampered is False
        assert "Broken chain" in err_tampered

    # --------------------------------------------------------------------------
    # 3. Idempotent Deduplication
    # --------------------------------------------------------------------------
    def test_03_idempotent_deduplication(self):
        fabric = DistributedEventFabric()
        payload = {"account": "ICICI_9988", "directive": "FREEZE"}

        evt1 = create_event(
            event_id="EVT_IDEMP_1",
            issuer_id="SYSTEM",
            institution_id="ICICI_BANK",
            event_type=EventType.FREEZE_DIRECTIVE_ISSUED,
            sequence_number=1,
            correlation_id="CASE_IDEMP_TEST",
            idempotency_key="UNIQUE_IDEMP_KEY_01",
            payload=payload,
        )
        res1 = fabric.append_event(evt1)
        assert res1["status"] == "COMMITTED"

        # Duplicate replay with same idempotency key and payload
        evt1_dup = create_event(
            event_id="EVT_IDEMP_1_DUP",
            issuer_id="SYSTEM",
            institution_id="ICICI_BANK",
            event_type=EventType.FREEZE_DIRECTIVE_ISSUED,
            sequence_number=1,
            correlation_id="CASE_IDEMP_TEST",
            idempotency_key="UNIQUE_IDEMP_KEY_01",
            payload=payload,
        )
        res2 = fabric.append_event(evt1_dup)
        assert res2["status"] == "DUPLICATE_IDEMPOTENT_IGNORE"
        assert len(fabric.get_committed_events()) == 1

        # Conflicting reuse of idempotency key with DIFFERENT payload
        evt_conflict = create_event(
            event_id="EVT_IDEMP_CONFLICT",
            issuer_id="SYSTEM",
            institution_id="ICICI_BANK",
            event_type=EventType.FREEZE_DIRECTIVE_ISSUED,
            sequence_number=1,
            correlation_id="CASE_IDEMP_TEST",
            idempotency_key="UNIQUE_IDEMP_KEY_01",
            payload={"account": "DIFFERENT_ACCOUNT", "directive": "UNFREEZE"},
        )
        res3 = fabric.append_event(evt_conflict)
        assert res3["status"] == "CONFLICTED_SUBMISSION"

    # --------------------------------------------------------------------------
    # 4. Out-of-Order Event Handling
    # --------------------------------------------------------------------------
    def test_04_out_of_order_quarantine(self):
        fabric = DistributedEventFabric()

        evt_seq10 = create_event(
            event_id="EVT_SEQ_10",
            issuer_id="SYSTEM",
            institution_id="AXIS_BANK",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=10,
            correlation_id="CASE_ORDER_TEST",
            idempotency_key="IDEMP_SEQ_10",
            payload={"seq": 10},
        )
        assert fabric.append_event(evt_seq10)["status"] == "COMMITTED"

        # Arrival of late event with seq=5 (< 10)
        evt_seq5 = create_event(
            event_id="EVT_SEQ_5",
            issuer_id="SYSTEM",
            institution_id="AXIS_BANK",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=5,
            correlation_id="CASE_ORDER_TEST",
            idempotency_key="IDEMP_SEQ_5",
            payload={"seq": 5},
        )
        res = fabric.append_event(evt_seq5)
        assert res["status"] == "OUT_OF_ORDER_QUARANTINED"
        assert fabric.get_event("EVT_SEQ_5").event_status == EventStatus.QUARANTINED

    # --------------------------------------------------------------------------
    # 5. Causal Dependency Buffering and Automatic Release
    # --------------------------------------------------------------------------
    def test_05_causal_dependency_buffering(self):
        fabric = DistributedEventFabric()

        # Step 1: Node A commits event 1
        evt_a1 = create_event(
            event_id="EVT_A1",
            issuer_id="NODE_A",
            institution_id="NODE_A",
            event_type=EventType.EVIDENCE_INGESTED,
            sequence_number=1,
            correlation_id="CASE_CAUSAL_01",
            idempotency_key="IDEMP_A1",
            payload={"step": "A1"},
            vector_clock={"NODE_A": 1}
        )
        assert fabric.append_event(evt_a1)["status"] == "COMMITTED"

        # Step 2: Node B emits event that causally depends on A2 (which has NOT arrived yet!)
        evt_b_dependent = create_event(
            event_id="EVT_B_DEP",
            issuer_id="NODE_B",
            institution_id="NODE_B",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=1,
            correlation_id="CASE_CAUSAL_01",
            idempotency_key="IDEMP_B_DEP",
            payload={"step": "B depends on A2"},
            vector_clock={"NODE_A": 2, "NODE_B": 1}  # Requires NODE_A seq 2!
        )
        res_b = fabric.append_event(evt_b_dependent)
        assert res_b["status"] == "CAUSAL_DEPENDENCY_PENDING"
        assert fabric.get_event("EVT_B_DEP").event_status == EventStatus.PENDING

        # Step 3: Now Node A's missing event 2 arrives
        evt_a2 = create_event(
            event_id="EVT_A2",
            issuer_id="NODE_A",
            institution_id="NODE_A",
            event_type=EventType.EVIDENCE_INGESTED,
            sequence_number=2,
            correlation_id="CASE_CAUSAL_01",
            idempotency_key="IDEMP_A2",
            payload={"step": "A2"},
            vector_clock={"NODE_A": 2}
        )
        res_a2 = fabric.append_event(evt_a2)
        assert res_a2["status"] == "COMMITTED"
        # The buffered event EVT_B_DEP is automatically drained and committed!
        assert "EVT_B_DEP" in res_a2["released_from_buffer"]
        assert fabric.get_event("EVT_B_DEP").event_status == EventStatus.COMMITTED

    # --------------------------------------------------------------------------
    # 6. Vector Clock Comparisons: 4-Way Order & Undefined
    # --------------------------------------------------------------------------
    def test_06_vector_clock_comparisons(self):
        v1 = VectorClock({"A": 1, "B": 0})
        v2 = VectorClock({"A": 2, "B": 1})
        v3 = VectorClock({"A": 0, "B": 2})

        # Happens Before
        assert v1.compare(v2) == CausalRelation.HAPPENS_BEFORE
        # Happens After
        assert v2.compare(v1) == CausalRelation.HAPPENS_AFTER
        # Concurrent
        assert v1.compare(v3) == CausalRelation.CONCURRENT
        assert v3.compare(v1) == CausalRelation.CONCURRENT
        # Identical
        assert v1.compare(v1.copy()) == CausalRelation.IDENTICAL
        # Undefined / Missing metadata
        assert v1.compare(None) == CausalRelation.UNDEFINED

    # --------------------------------------------------------------------------
    # 7. Concurrent Events: Non-Forced Total Order Invariant
    # --------------------------------------------------------------------------
    def test_07_concurrent_events_no_artificial_ordering(self):
        engine = TemporalConsistencyEngine(allowed_skew_seconds=60.0)

        ev_hdfc = engine.record_local_event("HDFC", "EV_HDFC_01", source_timestamp=100.0)
        ev_sbi = engine.record_local_event("SBI", "EV_SBI_01", source_timestamp=102.0)

        analysis = engine.analyze_event_pair(ev_hdfc, ev_sbi)
        # Even though SBI has wall_clock 102 > 100, vector clock proves CONCURRENT
        assert analysis["causal_relation"] == CausalRelation.CONCURRENT.value
        assert analysis["is_concurrent"] is True
        assert analysis["apparent_temporal_paradox"] is False

    # --------------------------------------------------------------------------
    # 8. Clock Skew vs True Causal Order (Apparent Paradox)
    # --------------------------------------------------------------------------
    def test_08_clock_skew_apparent_paradox(self):
        engine = TemporalConsistencyEngine(allowed_skew_seconds=600.0)

        # Node A creates event at wall-clock 500
        ev_a = engine.record_local_event("NODE_A", "EV_A", source_timestamp=500.0)

        # Node B receives it, ticks its clock, but Node B's RTC is desynchronized (wall-clock 450)
        ev_b = engine.receive_remote_event("NODE_B", ev_a)
        ev_b.source_timestamp = 450.0  # Skewed clock on Node B

        analysis = engine.analyze_event_pair(ev_a, ev_b)
        assert analysis["causal_relation"] == CausalRelation.HAPPENS_BEFORE.value
        assert analysis["apparent_temporal_paradox"] is True
        assert "Clock Skew Detected" in analysis["paradox_explanation"]

    # --------------------------------------------------------------------------
    # 9. Multi-Tenant Institution Access Isolation
    # --------------------------------------------------------------------------
    def test_09_institution_access_isolation(self):
        fabric = DistributedEventFabric()
        case_authorized = "CASE_RESTRICTED_77"
        case_unauthorized = "CASE_SECRET_99"

        fabric.register_case_authorization("BANK_A", case_authorized)

        # Authorized append passes
        evt_auth = create_event(
            event_id="EV_AUTH",
            issuer_id="OFFICER_1",
            institution_id="BANK_A",
            event_type=EventType.EVIDENCE_INGESTED,
            sequence_number=1,
            correlation_id=case_authorized,
            idempotency_key="IDEMP_AUTH",
            payload={"data": 123},
        )
        res1 = fabric.append_event(evt_auth, enforce_access_control=True)
        assert res1["status"] == "COMMITTED"

        # Unauthorized append fails closed and quarantines event
        evt_unauth = create_event(
            event_id="EV_UNAUTH",
            issuer_id="ROGUE_OFFICER",
            institution_id="BANK_A",
            event_type=EventType.EVIDENCE_INGESTED,
            sequence_number=2,
            correlation_id=case_unauthorized,
            idempotency_key="IDEMP_UNAUTH",
            payload={"data": 456},
        )
        res2 = fabric.append_event(evt_unauth, enforce_access_control=True)
        assert res2["status"] == "UNAUTHORIZED_INSTITUTION_ACCESS"

    # --------------------------------------------------------------------------
    # 10. Deterministic State Replay
    # --------------------------------------------------------------------------
    def test_10_deterministic_state_replay(self):
        fabric = DistributedEventFabric()

        for i in range(1, 6):
            evt = create_event(
                event_id=f"EV_REPLAY_{i}",
                issuer_id="SYSTEM",
                institution_id="HDFC_BANK",
                event_type=EventType.TRANSACTION_FLAGGED,
                sequence_number=i,
                correlation_id="CASE_REPLAY",
                idempotency_key=f"IDEMP_REP_{i}",
                payload={"index": i},
            )
            fabric.append_event(evt)

        # Replay slice: from sequence 2 up to 4
        replayed = fabric.replay_state(from_sequence=2, up_to_sequence=4)
        assert len(replayed) == 3
        assert [e.sequence_number for e in replayed] == [2, 3, 4]
        assert replayed[0].event_id == "EV_REPLAY_2"

    # --------------------------------------------------------------------------
    # 11. Four-Validator PBFT: Normal Honest Quorum (3 of 4)
    # --------------------------------------------------------------------------
    def test_11_pbft_honest_quorum(self):
        network = PBFTConsensusNetwork(faulty_node_behavior=None)
        proposal = {"directive": "FREEZE_MULE_ACCOUNT", "account": "ACC_MULE_01", "amount": 100000.0}

        res = network.run_consensus_round(proposal, verify_signatures=True)
        assert res["consensus_achieved"] is True
        assert res["committed_nodes_count"] == 4
        assert res["quorum_required"] == 3
        assert res["round_latency_ms"] >= 0

    # --------------------------------------------------------------------------
    # 12. Four-Validator PBFT: 1 Silent / Crashed Node
    # --------------------------------------------------------------------------
    def test_12_pbft_one_silent_node(self):
        network = PBFTConsensusNetwork(faulty_node_behavior="SILENT")
        proposal = {"directive": "FLAG_TRANSACTION", "vpa": "fraud@okaxis"}

        res = network.run_consensus_round(proposal, verify_signatures=True)
        assert res["consensus_achieved"] is True
        # Quorum of 3 is reached by honest nodes 0, 1, 2
        assert res["committed_nodes_count"] == 3
        assert "node_3" not in res["committed_nodes"]

    # --------------------------------------------------------------------------
    # 13. Four-Validator PBFT: 1 Byzantine Conflicting Node (Equivocation)
    # --------------------------------------------------------------------------
    def test_13_pbft_one_byzantine_conflicting_node(self):
        network = PBFTConsensusNetwork(faulty_node_behavior="CONFLICTING_DIGEST")
        proposal = {"directive": "UPDATE_CASE_STATE", "case_id": "CASE_2026_01"}

        res = network.run_consensus_round(proposal, verify_signatures=True)
        assert res["consensus_achieved"] is True
        # Honest nodes 0, 1, 2 reject Node 3's forged digest
        assert res["committed_nodes_count"] == 3
        assert set(res["committed_nodes"]) == {"node_0", "node_1", "node_2"}

    # --------------------------------------------------------------------------
    # 14. Four-Validator PBFT: Leader Failure and View Change
    # --------------------------------------------------------------------------
    def test_14_pbft_leader_failure_and_view_change(self):
        network = PBFTConsensusNetwork()
        assert network.primary_id == "node_0"

        # Simulate Node 0 crash
        network.nodes["node_0"].active = False

        # Attempting round with crashed primary fails
        res_fail = network.run_consensus_round({"test": 1})
        assert res_fail["consensus_achieved"] is False

        # Trigger View Change to view 1 (elects node_1 as primary)
        vc_res = network.trigger_view_change(target_view=1)
        assert vc_res["view_change_success"] is True
        assert vc_res["new_primary"] == "node_1"
        assert network.primary_id == "node_1"

        # New round under new primary node_1 succeeds
        res_new = network.run_consensus_round({"directive": "POST_VIEW_CHANGE_ACTION"})
        assert res_new["consensus_achieved"] is True
        assert "node_1" in res_new["committed_nodes"]

    # --------------------------------------------------------------------------
    # 15. Four-Validator PBFT: Duplicate Messages & Delays
    # --------------------------------------------------------------------------
    def test_15_pbft_duplicate_messages_tolerance(self):
        network = PBFTConsensusNetwork()
        proposal = {"directive": "DUPLICATE_TOLERANCE_TEST"}

        # Injects duplicate PREPARE and COMMIT messages during round
        res = network.run_consensus_round(proposal, duplicate_messages=True)
        assert res["consensus_achieved"] is True
        assert res["committed_nodes_count"] == 4

    # --------------------------------------------------------------------------
    # 16. Four-Validator PBFT: Network Partition (2x2 split blocks, heal resumes)
    # --------------------------------------------------------------------------
    def test_16_pbft_network_partition_and_recovery(self):
        network = PBFTConsensusNetwork()

        # Split network into 2 partitions: {node_0, node_1} and {node_2, node_3}
        # Neither partition has the required quorum of 3!
        network.partition_network([{"node_0", "node_1"}, {"node_2", "node_3"}])

        res_partitioned = network.run_consensus_round({"directive": "PARTITIONED_PROPOSAL"})
        assert res_partitioned["consensus_achieved"] is False
        assert res_partitioned["committed_nodes_count"] < 3

        # Heal network partition
        network.heal_partition()

        res_healed = network.run_consensus_round({"directive": "HEALED_PROPOSAL"})
        assert res_healed["consensus_achieved"] is True
        assert res_healed["committed_nodes_count"] == 4

    # --------------------------------------------------------------------------
    # 17. Claim Compiler Bridge: Event Cascade & Formal SMT Recomputation
    # --------------------------------------------------------------------------
    def test_17_claim_compiler_bridge_z3_recomputation(self):
        bridge = ClaimRecomputationBridge()

        # Create a financial fund dissipation claim: Initial 50k, outflow 20k -> expected balance 30k
        claim = CanonicalClaim(
            claim_id="CLAIM_DISSIPATION_01",
            claim_statement="Account ACC_VICTIM_01 dissipated funds to mule account",
            claim_type=ClaimType.FUND_DISSIPATION,
            evidence_dependencies=["EVID_BANK_01", "ACC_VICTIM_01"],
            version_and_replay_reference="replay_v1",
            claim_state=ClaimState.SUPPORTED
        )

        active_claims = [claim]
        account_balances = {"ACC_VICTIM_01": 30000.0}

        # Event arrives: transaction flagged on ACC_VICTIM_01 with outflow 20,000
        event = create_event(
            event_id="EVT_FLAG_TXN",
            issuer_id="BANK_SYSTEM",
            institution_id="HDFC_BANK",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=1,
            correlation_id="CASE_2026_01",
            idempotency_key="IDEMP_FLAG_TXN_01",
            payload={
                "account_number": "ACC_VICTIM_01",
                "initial_balance": 50000.0,
                "outflows": [20000.0],
                "inflows": []
            }
        )

        report = bridge.evaluate_event_impact(
            event=event,
            active_claims=active_claims,
            account_balances=account_balances
        )

        assert report.impacted_claims_count == 1
        assert report.human_action_required is True
        recomputed = report.recomputed_claims[0]
        assert recomputed.claim_id == "CLAIM_DISSIPATION_01"
        assert recomputed.updated_state == ClaimState.SUPPORTED
        assert recomputed.solver_result.get("invariant_satisfied") is True

    # --------------------------------------------------------------------------
    # 18. Formal SMT Contradiction Detection via Claim Bridge
    # --------------------------------------------------------------------------
    def test_18_claim_compiler_bridge_contradiction_counterexample(self):
        bridge = ClaimRecomputationBridge()

        # Claim with mathematically contradictory balance: Initial 50k, outflow 20k, but reported balance 45k (5k mismatch!)
        claim = CanonicalClaim(
            claim_id="CLAIM_DISSIPATION_CONTRADICTED",
            claim_statement="Account ACC_VICTIM_02 discrepancy analysis",
            claim_type=ClaimType.FUND_DISSIPATION,
            evidence_dependencies=["ACC_VICTIM_02"],
            version_and_replay_reference="replay_v1",
            claim_state=ClaimState.SUPPORTED
        )

        active_claims = [claim]
        # Inconsistent final balance: 45000 instead of 30000
        account_balances = {"ACC_VICTIM_02": 45000.0}

        event = create_event(
            event_id="EVT_FLAG_CONTRADICTORY",
            issuer_id="BANK_SYSTEM",
            institution_id="SBI_BANK",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=1,
            correlation_id="CASE_2026_02",
            idempotency_key="IDEMP_CONTRADICT_01",
            payload={
                "account_number": "ACC_VICTIM_02",
                "initial_balance": 50000.0,
                "outflows": [20000.0],
                "inflows": []
            }
        )

        report = bridge.evaluate_event_impact(
            event=event,
            active_claims=active_claims,
            account_balances=account_balances
        )

        recomputed = report.recomputed_claims[0]
        # Z3 solver mathematically proves contradiction and extracts counterexample
        assert recomputed.updated_state == ClaimState.CONTRADICTED
        assert len(recomputed.counterexamples) > 0
        assert abs(recomputed.counterexamples[0]["discrepancy"]) == 15000.0
