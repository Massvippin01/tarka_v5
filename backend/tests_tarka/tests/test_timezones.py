"""Tests for Checkpoint X2: Timezone and DST Handling.

Requirements tested:
1. IST is fixed at UTC+05:30 with zero Daylight Saving Time (DST).
2. UTC conversions match ground truth exact epoch seconds.
3. International zones with DST (e.g. America/New_York EDT vs EST) resolve accurately.
4. Mixed-zone detection: flags cases where multiple disparate timezones or ambiguous naive logs coexist.
"""

from __future__ import annotations

import datetime
from zoneinfo import ZoneInfo
import pytest

from tarka.core.timezones import (
    parse_datetime_forensic,
    audit_case_timezones,
    TimezoneClassification,
    IST_OFFSET_SECONDS,
)
from tarka.core.models import Fact, FactKind, TimeWindow, TrustTier, AuthType
from tarka.core.evidence_dna import EvidenceDNA
from tarka.core.display import format_epoch_to_local_ist


def test_fixed_ist_zero_dst():
    """Verifies that Indian Standard Time is strictly UTC+05:30 across winter and summer."""
    # Winter date: 2026-01-26 10:15:00
    res_winter = parse_datetime_forensic("2026-01-26T10:15:00+05:30")
    assert res_winter.original_tz_offset_seconds == IST_OFFSET_SECONDS
    assert res_winter.is_dst_active is False
    assert res_winter.classification == TimezoneClassification.IST_FIXED

    # Summer date: 2026-06-15 10:15:00
    res_summer = parse_datetime_forensic("2026-06-15T10:15:00+05:30")
    assert res_summer.original_tz_offset_seconds == IST_OFFSET_SECONDS
    assert res_summer.is_dst_active is False
    assert res_summer.classification == TimezoneClassification.IST_FIXED

    # Epoch difference between identical clock times 10:15 on winter vs summer in IST
    # exactly equals the physical time elapsed (no 1-hour jump like DST jurisdictions)
    diff = res_summer.utc_epoch - res_winter.utc_epoch
    # 140 days difference
    expected_diff = 140 * 86400
    assert diff == expected_diff


def test_utc_conversion_and_iso_normalization():
    """Verifies that UTC timestamps normalize cleanly to UTC epoch and ISO-8601 strings."""
    res_utc = parse_datetime_forensic("2026-01-26T04:45:00Z")
    assert res_utc.original_tz_offset_seconds == 0
    assert res_utc.classification == TimezoneClassification.UTC
    assert res_utc.utc_iso == "2026-01-26T04:45:00Z"

    # Corresponding IST timestamp
    res_ist = parse_datetime_forensic("2026-01-26T10:15:00+05:30")
    # 04:45:00 UTC + 5:30 = 10:15:00 IST -> exact physical equivalence
    assert res_utc.utc_epoch == res_ist.utc_epoch


def test_international_dst_transitions():
    """Verifies that international logs with DST transitions compute the correct UTC offset."""
    # US Eastern during Daylight Saving Time (June: EDT is UTC-04:00)
    res_edt = parse_datetime_forensic("2026-06-15 12:00:00", default_tz_name="America/New_York")
    assert res_edt.is_dst_active is True
    assert res_edt.original_tz_offset_seconds == -14400  # -4 hours

    # US Eastern during Standard Time (January: EST is UTC-05:00)
    res_est = parse_datetime_forensic("2026-01-15 12:00:00", default_tz_name="America/New_York")
    assert res_est.is_dst_active is False
    assert res_est.original_tz_offset_seconds == -18000  # -5 hours


def test_mixed_zone_log_audit():
    """Verifies that audit_case_timezones detects mixed-zone logs and produces forensic warnings."""
    # Create synthetic facts with differing timezone provenance
    f1 = Fact(
        id="FACT_LOG_IST",
        source_file="airtel_cdr.csv",
        sha256="1" * 64,
        line_ref="row:1",
        kind=FactKind.CDR_CALL,
        device_id="DEV_TELCO_SWITCH",
        auth_type=AuthType.PASSIVE,
        time_window=TimeWindow(start_epoch=1770000000, end_epoch=1770000060, reported_epoch=1770000000),
        region=None,
        tier=TrustTier.T1,
        clock_id="clk_telco_ist",
        raw_payload={"original_tz": "Asia/Kolkata (IST UTC+05:30)"},
    )

    f2 = Fact(
        id="FACT_LOG_UTC",
        source_file="aws_cloudwatch_access.log",
        sha256="2" * 64,
        line_ref="row:45",
        kind=FactKind.BANK_TXN,
        device_id="DEV_BANK_CORE",
        auth_type=AuthType.ACTIVE,
        time_window=TimeWindow(start_epoch=1770000000, end_epoch=1770000060, reported_epoch=1770000000),
        region=None,
        tier=TrustTier.T1,
        clock_id="clk_server_utc",
        raw_payload={"original_tz": "UTC (+00:00)"},
    )

    report = audit_case_timezones([f1, f2])
    assert report.is_mixed_zone is True
    assert len(report.detected_timezones) == 2
    assert any("Mixed timezone sources detected" in w for w in report.audit_warnings)
    assert any("Asia/Kolkata" in z for z in report.detected_timezones)
    assert any("UTC" in z for z in report.detected_timezones)


def test_evidence_dna_to_fact_timestamp_normalization():
    """DATA-02: Verifies that EvidenceDNA.to_fact() accurately normalizes timestamps across formats."""
    dummy_sha = "0" * 64

    # 1. Bank CSV timestamp (DD/MM/YYYY HH:MM:SS)
    dna_bank = EvidenceDNA(
        evidence_id="DNA-TEST-001",
        artifact_id="ART-001",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.BANK_TXN,
        source_raw_text="14/02/2026,10:19:30,...",
        source_line_ref="row:2",
        event_timestamp_iso="14/02/2026 10:19:30",
        event_timestamp_epoch=None,
    )
    f_bank = dna_bank.to_fact("bank.csv", dummy_sha)
    assert f_bank.time_window.reported_epoch == 1771044570.0
    assert f_bank.time_window.start_epoch == 1771044570.0
    assert f_bank.time_window.end_epoch == 1771044570.0
    t_disp, _, d_disp = format_epoch_to_local_ist(f_bank.time_window.reported_epoch)
    assert t_disp == "10:19 AM IST, 14 Feb 2026"
    assert d_disp == "14 Feb 2026"
    assert f_bank.raw_payload.get("is_timestamp_missing") is False

    # 2. WhatsApp chat timestamp with comma ([DD/MM/YYYY, HH:MM:SS])
    dna_wa = EvidenceDNA(
        evidence_id="DNA-TEST-002",
        artifact_id="ART-002",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.WA_MESSAGE,
        source_raw_text="[14/02/2026, 10:12:30] ...",
        source_line_ref="line:2",
        event_timestamp_iso="14/02/2026, 10:12:30",
        event_timestamp_epoch=None,
    )
    f_wa = dna_wa.to_fact("chat.txt", dummy_sha)
    assert f_wa.time_window.reported_epoch == 1771044150.0
    t_disp, _, _ = format_epoch_to_local_ist(f_wa.time_window.reported_epoch)
    assert t_disp == "10:12 AM IST, 14 Feb 2026"

    # 3. CDR timestamp (DD/MM/YYYY HH:MM:SS)
    dna_cdr = EvidenceDNA(
        evidence_id="DNA-TEST-003",
        artifact_id="ART-003",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.CDR_CALL,
        source_raw_text="14/02/2026 10:06:00,...",
        source_line_ref="row:2",
        event_timestamp_iso="14/02/2026 10:06:00",
        event_timestamp_epoch=None,
    )
    f_cdr = dna_cdr.to_fact("cdr.csv", dummy_sha)
    assert f_cdr.time_window.reported_epoch == 1771043760.0
    t_disp, _, _ = format_epoch_to_local_ist(f_cdr.time_window.reported_epoch)
    assert t_disp == "10:06 AM IST, 14 Feb 2026"

    # 4. Explicit ISO claim timestamp with timezone (+05:30)
    dna_claim = EvidenceDNA(
        evidence_id="DNA-TEST-004",
        artifact_id="ART-004",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.CLAIM,
        source_raw_text="Claim record",
        source_line_ref="line:1",
        event_timestamp_iso="2026-02-14T10:15:00+05:30",
        event_timestamp_epoch=None,
    )
    f_claim = dna_claim.to_fact("claim.json", dummy_sha)
    assert f_claim.time_window.reported_epoch == 1771044300.0
    t_disp, _, _ = format_epoch_to_local_ist(f_claim.time_window.reported_epoch)
    assert t_disp == "10:15 AM IST, 14 Feb 2026"

    # 5. Explicitly populated epoch is preserved without reparsing
    dna_explicit = EvidenceDNA(
        evidence_id="DNA-TEST-005",
        artifact_id="ART-005",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.BANK_TXN,
        source_raw_text="Raw bank row",
        source_line_ref="row:1",
        event_timestamp_iso="14/02/2026 10:19:30",
        event_timestamp_epoch=1771000000.0,
        time_window_start_epoch=1771000000.0,
        time_window_end_epoch=1771000010.0,
    )
    f_exp = dna_explicit.to_fact("bank.csv", dummy_sha)
    assert f_exp.time_window.reported_epoch == 1771000000.0
    assert f_exp.time_window.start_epoch == 1771000000.0
    assert f_exp.time_window.end_epoch == 1771000010.0

    # 6. Missing timestamp safely defaults to 0.0 with is_timestamp_missing flag
    dna_none = EvidenceDNA(
        evidence_id="DNA-TEST-006",
        artifact_id="ART-006",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.CLAIM,
        source_raw_text="Binary bitstream without timestamp",
        source_line_ref="byte:0",
        event_timestamp_iso=None,
        event_timestamp_epoch=None,
    )
    f_none = dna_none.to_fact("binary.bin", dummy_sha)
    assert f_none.time_window.reported_epoch == 0.0
    assert f_none.raw_payload.get("is_timestamp_missing") is True

    # 7. Malformed timestamp raises ValueError loudly (no silent epoch 0)
    dna_bad = EvidenceDNA(
        evidence_id="DNA-TEST-007",
        artifact_id="ART-007",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.BANK_TXN,
        source_raw_text="Corrupt row",
        source_line_ref="row:1",
        event_timestamp_iso="NOT_A_VALID_DATE",
        event_timestamp_epoch=None,
    )
    with pytest.raises(ValueError):
        dna_bad.to_fact("bank.csv", dummy_sha)


def test_invalid_time_window_rejection():
    """DATA-02: Verifies that invalid time windows (end < start) raise ValueError rather than being silently clamped."""
    dummy_sha = "0" * 64
    dna_invalid_tw = EvidenceDNA(
        evidence_id="DNA-TEST-008",
        artifact_id="ART-008",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.BANK_TXN,
        source_raw_text="...",
        source_line_ref="row:1",
        event_timestamp_iso="14/02/2026 10:19:30",
        event_timestamp_epoch=1771044570.0,
        time_window_start_epoch=1771044600.0,
        time_window_end_epoch=1771044500.0,  # end < start
    )
    with pytest.raises(ValueError, match="end_epoch.*cannot be earlier than start_epoch"):
        dna_invalid_tw.to_fact("bank.csv", dummy_sha)


def test_canonical_fact_and_fact_missing_timestamp_consistency():
    """DATA-03: Verifies that CanonicalFact and Fact maintain consistent missing-timestamp semantics."""
    dummy_sha = "c" * 64
    dna_missing = EvidenceDNA(
        evidence_id="DNA-TEST-009",
        artifact_id="ART-009",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.CLAIM,
        source_raw_text="No timestamp bitstream",
        source_line_ref="byte:0",
        event_timestamp_iso=None,
        event_timestamp_epoch=None,
    )
    fact = dna_missing.to_fact("evidence.png", dummy_sha)
    cf = dna_missing.to_canonical_fact("evidence.png", dummy_sha)
    solver_fact = cf.to_solver_fact()

    # Fact and CanonicalFact agreement
    assert fact.raw_payload.get("is_timestamp_missing") is True
    assert cf.time_provenance.is_inferred is True
    assert cf.time_provenance.assumed_timezone == "MISSING_SOURCE_TIMESTAMP"
    assert solver_fact.raw_payload.get("is_timestamp_missing") is True


def test_unreliable_timestamp_evidence_gap_rule_fires():
    """DATA-03: Verifies that RULE_GAP_INFERRED_TIMESTAMP fires for untimestamped timeline events."""
    from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, build_timezone_provenance
    from tarka.core.timeline_reconstruction import TimelineReconstructionEngine
    from tarka.core.contradiction_analysis import ContradictionAnalysisEngine
    from tarka.core.evidence_dna import Artifact

    art = Artifact(
        artifact_id="ART-IMG-001",
        case_id="CASE-001",
        filename="screenshot.png",
        sha256="d" * 64,
        file_size_bytes=1024,
        mime_type="image/png",
        source_tier=TrustTier.T3,
        custody_chain_sequence=1,
        storage_path="cases/CASE-001/screenshot.png",
        intake_officer="Officer A",
        intake_timestamp_iso="2026-02-14T10:30:00Z",
    )

    # Untimestamped image fact
    time_prov = build_timezone_provenance("")
    assert time_prov.is_inferred is True

    cf_img = CanonicalFact(
        fact_id="FACT-IMG-001",
        case_id="CASE-001",
        artifact_id="ART-IMG-001",
        evidence_id="DNA-IMG-001",
        kind=CanonicalFactKind.MEDIA_METADATA,
        source_filename="screenshot.png",
        source_location="byte:0",
        sha256="d" * 64,
        time_provenance=time_prov,
        trust_tier=TrustTier.T3,
        auth_track=AuthType.PASSIVE,
        summary="Image without temporal metadata",
        raw_source_snippet="PNG raw bytes",
    )

    recon = TimelineReconstructionEngine()
    events = recon.extract_events_from_facts([cf_img], [art])
    assert len(events) == 1
    evt = events[0]
    assert evt.is_timestamp_inferred is True
    assert evt.temporal_priority == 4
    assert evt.timestamp == "Timestamp not recorded (Case intake default)"

    # ContradictionAnalysisEngine evaluates evidence gaps
    contra_engine = ContradictionAnalysisEngine()
    timeline_view = recon.build_timeline(case_id="CASE-001", facts=[cf_img], artifacts=[art])
    report = contra_engine.analyze_case(case_id="CASE-001", facts=[cf_img], artifacts=[art], timeline=timeline_view)

    # Gap Rule 3: RULE_GAP_INFERRED_TIMESTAMP must fire
    gap_rules = [g.exposed_by_rule_id for g in report.evidence_gaps]
    assert "RULE_GAP_INFERRED_TIMESTAMP" in gap_rules
    inferred_gap = next(g for g in report.evidence_gaps if g.exposed_by_rule_id == "RULE_GAP_INFERRED_TIMESTAMP")
    assert inferred_gap.relevant_event_ids == [evt.event_id]


def test_z3_missing_timestamp_not_constrained_to_1970():
    """DATA-03: Verifies that Z3ConstraintBuilder does not constrain missing timestamps to 1970 (epoch zero)."""
    from tarka.solver.z3_builder import Z3ConstraintBuilder
    import z3

    dummy_sha = "e" * 64
    f_missing = Fact(
        id="FACT-Z3-MISSING",
        source_file="unanchored.bin",
        sha256=dummy_sha,
        line_ref="byte:0",
        kind=FactKind.CLAIM,
        time_window=TimeWindow(start_epoch=0.0, end_epoch=0.0, reported_epoch=0.0),
        region=None,
        tier=TrustTier.T3,
        auth_type=AuthType.PASSIVE,
        device_id="DEV_NONE",
        clock_id="clk_none",
        raw_payload={"is_timestamp_missing": True},
    )

    builder = Z3ConstraintBuilder()
    solver, literal_map, bundle = builder.build_solver(
        facts=[f_missing],
        clock_bounds={"clk_none": 120.0},
    )

    # Solver should be SAT and t_true should NOT be restricted to [-120, +120] (1970)
    assumptions = builder.get_assumptions_for_facts([f_missing], literal_map)
    assert solver.check(assumptions) == z3.sat

    # Verify that solver can satisfy t_true = 1771064370.0 (Feb 2026) without contradiction
    solver.push()
    t_true_var = z3.Real("t_true_FACT-Z3-MISSING")
    solver.add(t_true_var == 1771064370.0)
    assert solver.check(assumptions) == z3.sat
    solver.pop()


def test_valid_timestamped_records_retain_constraints_and_chronology():
    """DATA-03: Verifies that valid timestamped records maintain rigorous constraints and ordering."""
    from tarka.solver.z3_builder import Z3ConstraintBuilder
    import z3

    dummy_sha = "f" * 64
    # Two events in 2026 separated by 10 seconds on same clock
    t1 = 1771064370.0
    t2 = 1771064380.0
    f1 = Fact(
        id="FACT-VALID-01",
        source_file="log1.txt",
        sha256=dummy_sha,
        line_ref="1",
        kind=FactKind.BANK_TXN,
        time_window=TimeWindow(start_epoch=t1, end_epoch=t1, reported_epoch=t1),
        region=None,
        tier=TrustTier.T1,
        auth_type=AuthType.ACTIVE,
        device_id="DEV_A",
        clock_id="clk_sync",
        raw_payload={"is_timestamp_missing": False},
    )
    f2 = Fact(
        id="FACT-VALID-02",
        source_file="log2.txt",
        sha256=dummy_sha,
        line_ref="2",
        kind=FactKind.CDR_CALL,
        time_window=TimeWindow(start_epoch=t2, end_epoch=t2, reported_epoch=t2),
        region=None,
        tier=TrustTier.T1,
        auth_type=AuthType.PASSIVE,
        device_id="DEV_A",
        clock_id="clk_sync",
        raw_payload={"is_timestamp_missing": False},
    )

    builder = Z3ConstraintBuilder()
    solver, literal_map, bundle = builder.build_solver(
        facts=[f1, f2],
        clock_bounds={"clk_sync": 1.0},
    )
    assumptions = builder.get_assumptions_for_facts([f1, f2], literal_map)
    assert solver.check(assumptions) == z3.sat

    # Constraining t1 > t2 should be UNSAT (ordering preserved under 1.0s clock bounds)
    solver.push()
    t_true_1 = z3.Real("t_true_FACT-VALID-01")
    t_true_2 = z3.Real("t_true_FACT-VALID-02")
    solver.add(t_true_1 > t_true_2)
    assert solver.check(assumptions) == z3.unsat
    solver.pop()


def test_real_timestamped_event_normalization_and_display():
    """DATA-03: Verifies that real timestamped 2026 event normalizes accurately and displays without missing flags."""
    dummy_sha = "0" * 64
    dna_real = EvidenceDNA(
        evidence_id="DNA-REAL-001",
        artifact_id="ART-REAL-001",
        case_id="CASE-001",
        record_index=1,
        kind=FactKind.BANK_TXN,
        source_raw_text="14/02/2026 10:19:30,TXN001,₹5000",
        source_line_ref="row:1",
        event_timestamp_iso="14/02/2026 10:19:30",
        event_timestamp_epoch=None,
    )
    fact = dna_real.to_fact("bank.csv", dummy_sha)
    assert fact.raw_payload.get("is_timestamp_missing") is False
    assert fact.time_window.reported_epoch == 1771044570.0

    from tarka.core.display import build_fact_display_model
    display_model = build_fact_display_model(fact, {"clk_case": 120.0})
    assert display_model.is_timestamp_missing is False
    assert display_model.time_display == "10:19 AM IST, 14 Feb 2026"
    assert display_model.time_short == "10:19 AM"
    assert display_model.date_display == "14 Feb 2026"


