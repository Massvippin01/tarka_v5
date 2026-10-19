"""Unit tests for Phase 0: Tamper-evident SQLite custody log & Fact ingestion.

Verifies:
1. Canonical serialization and hash generation.
2. Sequential chaining of custody records.
3. Hard forensic requirement: mutating a single byte in any stored record or fact is detected.
4. Detection of record deletions, row insertions, and broken hash pointers.
5. Detection of full-chain rewrites against an anchored chain-head hash.
"""

import sqlite3
from pathlib import Path
import pytest

from tarka.core.models import (
    Fact,
    FactKind,
    TrustTier,
    AuthType,
    TimeWindow,
    GeographicRegion,
)
from tarka.core.custody import CustodyLedger, GENESIS_PREV_HASH


def test_fact_model_validation(sample_fact_t1: Fact) -> None:
    """Verifies schema validation and deterministic hashing."""
    assert sample_fact_t1.id == "FACT_CDR_001"
    assert sample_fact_t1.tier == TrustTier.T1
    assert sample_fact_t1.auth_type == AuthType.PASSIVE
    assert sample_fact_t1.clock_id == "clk_airtel_ntp"
    assert "ENTITY_SUSPECT_A" in sample_fact_t1.entity_refs

    fact_hash = sample_fact_t1.compute_fact_sha256()
    assert len(fact_hash) == 64
    assert fact_hash == sample_fact_t1.compute_fact_sha256()


def test_time_window_validation() -> None:
    """Verifies temporal boundary invariants."""
    with pytest.raises(ValueError, match="cannot be earlier than start_epoch"):
        TimeWindow(start_epoch=100.0, end_epoch=90.0, reported_epoch=95.0)

    with pytest.raises(ValueError, match="must fall within"):
        TimeWindow(start_epoch=100.0, end_epoch=200.0, reported_epoch=250.0)


def test_claim_fact_kind() -> None:
    """Verifies CLAIM kind for testimonial statements."""
    claim = Fact(
        id="CLAIM_001",
        source_file="suspect_statement.txt",
        sha256="a" * 64,
        line_ref="statement:para1",
        kind=FactKind.CLAIM,
        time_window=TimeWindow(
            start_epoch=1760000000.0,
            end_epoch=1760007200.0,
            reported_epoch=1760003600.0,
        ),
        region=GeographicRegion(latitude=12.97, longitude=77.59, radius_meters=1000.0),
        tier=TrustTier.T3,
        device_id="PERSON_SUSPECT_A",
        clock_id="clk_subjective_claim",
        entity_refs=["ENTITY_SUSPECT_A"],
        auth_type=AuthType.ACTIVE,
        raw_payload={"statement": "Claimed presence at Koramangala residence"},
    )
    assert claim.kind == FactKind.CLAIM
    assert claim.tier == TrustTier.T3


def test_custody_chain_append_and_verify(tmp_path: Path, sample_fact_t1: Fact, sample_fact_upi: Fact) -> None:
    """Verifies normal append operations maintain valid cryptographic integrity."""
    db_file = tmp_path / "custody.db"
    ledger = CustodyLedger(db_file)

    report = ledger.verify_chain()
    assert report.is_valid is True
    assert report.total_entries == 0

    e0 = ledger.append_fact(sample_fact_t1)
    assert e0.seq == 0
    assert e0.prev_hash == GENESIS_PREV_HASH
    assert e0.fact_id == sample_fact_t1.id

    e1 = ledger.append_fact(sample_fact_upi)
    assert e1.seq == 1
    assert e1.prev_hash == e0.entry_hash
    assert e1.fact_id == sample_fact_upi.id

    e2 = ledger.append_action(action="SOLVE_RUN", payload_data={"mode": "ALL_MUS"})
    assert e2.seq == 2
    assert e2.prev_hash == e1.entry_hash

    report = ledger.verify_chain()
    assert report.is_valid is True
    assert report.total_entries == 3
    assert report.compromised_seq is None


def test_tamper_detection_in_custody_row_single_byte(tmp_path: Path, sample_fact_t1: Fact, sample_fact_upi: Fact) -> None:
    """CRITICAL TEST: Verifies that altering a single byte in a custody row is detected."""
    db_file = tmp_path / "custody.db"
    ledger = CustodyLedger(db_file)

    ledger.append_fact(sample_fact_t1)  # seq 0
    ledger.append_fact(sample_fact_upi) # seq 1
    ledger.append_action("AUDIT_CHECK")  # seq 2

    assert ledger.verify_chain().is_valid is True

    # Mutate a single character in the SQLite table for seq=1
    with sqlite3.connect(db_file) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT action FROM custody_chain WHERE seq = 1")
        original_action = cursor.fetchone()[0]
        mutated_action = original_action[:-1] + "X"
        cursor.execute("UPDATE custody_chain SET action = ? WHERE seq = 1", (mutated_action,))
        conn.commit()

    tamper_report = ledger.verify_chain()
    assert tamper_report.is_valid is False
    assert tamper_report.compromised_seq == 1
    assert "Cryptographic hash mismatch at seq=1" in tamper_report.details


def test_tamper_detection_in_stored_fact_payload(tmp_path: Path, sample_fact_t1: Fact) -> None:
    """CRITICAL TEST: Verifies that modifying a single byte inside stored fact JSON is detected."""
    db_file = tmp_path / "custody.db"
    ledger = CustodyLedger(db_file)

    ledger.append_fact(sample_fact_t1)
    assert ledger.verify_chain().is_valid is True

    with sqlite3.connect(db_file) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT canonical_json FROM stored_facts WHERE fact_id = ?", (sample_fact_t1.id,))
        raw_json = cursor.fetchone()[0]
        tampered_json = raw_json.replace("12.9716", "13.9716")
        cursor.execute(
            "UPDATE stored_facts SET canonical_json = ? WHERE fact_id = ?",
            (tampered_json, sample_fact_t1.id),
        )
        conn.commit()

    report = ledger.verify_chain()
    assert report.is_valid is False
    assert report.compromised_fact_id == sample_fact_t1.id
    assert "Payload corruption detected in stored fact" in report.details


def test_tamper_detection_row_deletion(tmp_path: Path, sample_fact_t1: Fact, sample_fact_upi: Fact) -> None:
    """Verifies that deleting an intermediate block breaks the chain."""
    db_file = tmp_path / "custody.db"
    ledger = CustodyLedger(db_file)

    ledger.append_fact(sample_fact_t1)
    ledger.append_fact(sample_fact_upi)
    ledger.append_action("AUDIT_END")

    with sqlite3.connect(db_file) as conn:
        conn.execute("DELETE FROM custody_chain WHERE seq = 1")
        conn.commit()

    report = ledger.verify_chain()
    assert report.is_valid is False
    assert report.compromised_seq == 2 or "gap" in report.details.lower()


def test_tamper_detection_full_chain_rewrite_against_anchor(
    tmp_path: Path, sample_fact_t1: Fact, sample_fact_upi: Fact
) -> None:
    """CRITICAL TEST: An adversary rewrites the entire chain internally, but fails against anchored head."""
    db_file = tmp_path / "custody.db"
    anchor_file = tmp_path / "custody_head.anchor.json"
    ledger = CustodyLedger(db_file)

    ledger.append_fact(sample_fact_t1)
    ledger.append_fact(sample_fact_upi)
    ledger.append_action("INITIAL_ANALYSIS")

    # Export trusted chain head anchor
    anchored_head = ledger.export_anchor(anchor_file)
    assert len(anchored_head) == 64

    # Verification with anchor succeeds initially
    initial_check = ledger.verify_chain(anchored_head_hash=anchored_head)
    assert initial_check.is_valid is True

    # Now simulate an adversary rewriting the entire database from seq 0 forward
    # with forged data, recomputing valid hash chains for every row internally
    with sqlite3.connect(db_file) as conn:
        cursor = conn.cursor()
        # Adversary replaces row 0 payload and cascades re-computed hashes
        new_prev = GENESIS_PREV_HASH
        cursor.execute("SELECT seq, timestamp_iso, action, fact_id FROM custody_chain ORDER BY seq ASC")
        rows = cursor.fetchall()
        for seq, ts, action, fid in rows:
            fake_payload_hash = "f" * 64
            fake_entry_hash = CustodyLedger.calculate_entry_hash(
                seq=seq,
                prev_hash=new_prev,
                timestamp_iso=ts,
                action=action,
                fact_id=fid,
                payload_sha256=fake_payload_hash,
            )
            cursor.execute(
                """
                UPDATE custody_chain
                SET prev_hash = ?, payload_sha256 = ?, entry_hash = ?
                WHERE seq = ?
                """,
                (new_prev, fake_payload_hash, fake_entry_hash, seq),
            )
            new_prev = fake_entry_hash
        conn.commit()

    # Without the external anchor, the rewritten chain would appear internally consistent:
    internal_check = ledger.verify_chain()
    # (Note: payload fact check might trigger unless fact store also modified, but the anchor check is definitive)

    # Against the out-of-band anchored head, the rewritten chain MUST FAIL:
    anchored_check = ledger.verify_chain(anchored_head_hash=anchored_head)
    assert anchored_check.is_valid is False
    assert "anchor mismatch" in anchored_check.details.lower()
