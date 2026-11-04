"""
Automated Test Suite for Workstream B3:
Distributed Evidence Event Model, Append-Only Event Store, Idempotency, and Replay.
"""

import pytest
from tarka.distributed.event_envelope import EventEnvelope, EventStatus, EventType, create_event
from tarka.distributed.event_store import EventStore


class TestWorkstreamB3DistributedEvents:
    """Test suite verifying Workstream B3 Distributed Event Model."""

    def test_event_envelope_creation_and_digest(self):
        """Verify envelope structure, payload commitment, and deterministic digest."""
        payload = {"artifact_id": "ART-001", "file_name": "cdr_log.csv", "sha256": "abcdef123456"}
        event = create_event(
            event_id="EVT-001",
            issuer_id="OFFICER_PATEL",
            institution_id="INST_HDFC",
            event_type=EventType.EVIDENCE_INGESTED,
            sequence_number=1,
            correlation_id="CASE-2026-001",
            idempotency_key="IDEMP-001",
            payload=payload,
        )

        assert event.event_status == EventStatus.COMMITTED
        assert event.verify_payload_integrity() is True
        assert len(event.compute_envelope_digest()) == 64

    def test_event_store_idempotent_deduplication(self):
        """Verify an identical event delivered twice does NOT create two independent events."""
        store = EventStore()
        payload = {"account_number": "ACC-998877", "risk_score": 0.95}

        ev1 = create_event(
            event_id="EVT-100",
            issuer_id="AI_ENGINE",
            institution_id="INST_HDFC",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=1,
            correlation_id="CASE-MULE-99",
            idempotency_key="IDEMP-KEY-TX-998877",
            payload=payload,
        )

        # First delivery
        res1 = store.append_event(ev1)
        assert res1["status"] == "COMMITTED"
        assert len(store.get_all_events()) == 1

        # Duplicate delivery with identical idempotency key and payload
        ev1_dup = create_event(
            event_id="EVT-100-DUP",
            issuer_id="AI_ENGINE",
            institution_id="INST_HDFC",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=1,
            correlation_id="CASE-MULE-99",
            idempotency_key="IDEMP-KEY-TX-998877",
            payload=payload,
        )

        res2 = store.append_event(ev1_dup)
        assert res2["status"] == "DUPLICATE_IDEMPOTENT_IGNORE"
        # Total committed events in store remains exactly 1!
        committed_events = [e for e in store.get_all_events() if e.event_status == EventStatus.COMMITTED]
        assert len(committed_events) == 1

    def test_conflicting_idempotency_submission(self):
        """Verify that reusing an idempotency key with conflicting payload marks it CONFLICTED."""
        store = EventStore()

        ev1 = create_event(
            event_id="EVT-ORIG",
            issuer_id="SYSTEM",
            institution_id="INST_ICICI",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=1,
            correlation_id="CASE-01",
            idempotency_key="IDEMP-SHARED",
            payload={"flag": "MULE"},
        )
        store.append_event(ev1)

        # Conflicting event reusing same idempotency key with contradictory payload
        ev_conflict = create_event(
            event_id="EVT-CONFLICT",
            issuer_id="SYSTEM",
            institution_id="INST_ICICI",
            event_type=EventType.TRANSACTION_FLAGGED,
            sequence_number=2,
            correlation_id="CASE-01",
            idempotency_key="IDEMP-SHARED",
            payload={"flag": "LEGITIMATE_MERCHANT"},
        )
        res = store.append_event(ev_conflict)
        assert res["status"] == "CONFLICTED_SUBMISSION"
        assert ev_conflict.event_status == EventStatus.CONFLICTED

    def test_out_of_order_event_quarantine(self):
        """Verify an out-of-order event is quarantined and does not overwrite authoritative sequence."""
        store = EventStore()

        ev2 = create_event("EVT-SEQ2", "USER", "INST_AXIS", EventType.CASE_STATE_UPDATED, 2, "C1", "K2", {"step": 2})
        store.append_event(ev2)

        # Delayed event with sequence 1 arriving after sequence 2
        ev1_delayed = create_event("EVT-SEQ1", "USER", "INST_AXIS", EventType.CASE_STATE_UPDATED, 1, "C1", "K1", {"step": 1})
        res = store.append_event(ev1_delayed)

        assert res["status"] == "OUT_OF_ORDER_QUARANTINED"
        assert ev1_delayed.event_status == EventStatus.QUARANTINED

    def test_cryptographic_hash_chain_integrity(self):
        """Verify sequential Merkle hash chaining across events and detect tampering."""
        store = EventStore()

        for i in range(1, 6):
            ev = create_event(
                f"EVT-CHAIN-{i}",
                "USER",
                "INST_HDFC",
                EventType.EVIDENCE_INGESTED,
                i,
                "CASE-CORR",
                f"IDEMP-CHAIN-{i}",
                {"doc_index": i},
            )
            store.append_event(ev)

        valid, err = store.verify_chain_integrity()
        assert valid is True
        assert err is None

        # Simulate adversarial historical modification of event 2's payload commitment
        committed_events = [e for e in store.get_all_events() if e.event_status == EventStatus.COMMITTED]
        committed_events[1].payload_commitment = "0" * 64

        valid_tampered, err_tampered = store.verify_chain_integrity()
        assert valid_tampered is False
        assert "Broken chain" in err_tampered

    def test_state_replay_reconstruction(self):
        """Verify that authoritative domain state can be deterministically replayed."""
        store = EventStore()
        corr_id = "CASE-REPLAY-404"

        # 1. Ingest evidence
        store.append_event(
            create_event("E1", "OFFICER", "INST_A", EventType.EVIDENCE_INGESTED, 1, corr_id, "K1", {"artifact_id": "ART-PHONE-LOG"})
        )
        # 2. Flag mule account
        store.append_event(
            create_event("E2", "AI_AGENT", "INST_A", EventType.TRANSACTION_FLAGGED, 2, corr_id, "K2", {"account_number": "ACC-MULE-123"})
        )
        # 3. Issue freeze directive
        store.append_event(
            create_event("E3", "OFFICER", "INST_A", EventType.FREEZE_DIRECTIVE_ISSUED, 3, corr_id, "K3", {"target_account": "ACC-MULE-123"})
        )

        # Full replay
        full_state = store.replay_state(corr_id)
        assert full_state["total_events_replayed"] == 3
        assert "ART-PHONE-LOG" in full_state["evidence_items"]
        assert "ACC-MULE-123" in full_state["flagged_accounts"]
        assert "ACC-MULE-123" in full_state["frozen_accounts"]

        # Partial replay up to sequence 2 (before freeze directive)
        partial_state = store.replay_state(corr_id, up_to_sequence=2)
        assert partial_state["total_events_replayed"] == 2
        assert "ACC-MULE-123" in partial_state["flagged_accounts"]
        assert "ACC-MULE-123" not in partial_state["frozen_accounts"]  # Not yet frozen at seq 2!

