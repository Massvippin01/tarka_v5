"""Tests for Checkpoint X2: Clock-Skew and Timestamp Tamper Inference Engine.

Requirements tested:
1. Per-device clock offset is a solver variable within a bounded range. The solver
   infers the offset that reconciles the timeline and reports it.
2. Flag implausible offsets as possible timestamp tampering:
   - Case A: Inferred UPI clock offset >160 min flagged as IMPLAUSIBLE_TAMPER_FLAG.
   - Planted case: Device B clock inferred at +13.2 min ahead, flagged as possible timestamp tampering.
3. Dual-track model: Passive device presence vs active human authentication.
   Adds hypothesis "device present, person not (relay, SIM swap, remote access)" as a hypothesis, not a fact.
4. Transport-feasibility model stays configurable (ground, air plus airport overhead).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app
from tarka.core.models import (
    Fact,
    FactKind,
    TimeWindow,
    GeographicRegion,
    TrustTier,
    AuthType,
)
from tarka.core.travel import TravelSpeedConfig, compute_travel_lower_bound
from tarka.generator.synthetic_cases import (
    generate_case_a_impossible_alibi,
    generate_case_c_consistent_control,
)
from tarka.solver.skew_inference import (
    infer_required_clock_offsets,
    TamperRiskLevel,
)
from tarka.solver.hypotheses import compute_hypothesis_report


@pytest.fixture
def client():
    return TestClient(app)


def test_clock_offset_inference_case_a_flagged_tamper():
    """Verifies that the solver infers the massive clock offset needed to reconcile Case A and flags it as tampering."""
    case_a = generate_case_a_impossible_alibi()
    report = infer_required_clock_offsets(
        facts=case_a.facts,
        clock_bounds=case_a.clock_bounds,
        mus_cores=[["FACT_CASE_A_CDR_BLR", "FACT_CASE_A_UPI_DEL"]],
    )

    assert report.is_case_reconciled is True
    assert len(report.inferred_offsets) >= 2
    assert len(report.tamper_alerts) >= 1

    # Find the inferred offset on the UPI clock
    upi_offset = next((o for o in report.inferred_offsets if "npci" in o.clock_id or "upi" in o.clock_id.lower()), None)
    assert upi_offset is not None

    # The required offset between Delhi and BLR (1740 km) for a 30-min window is >150 minutes
    assert upi_offset.inferred_offset_minutes > 150.0
    assert upi_offset.is_implausible_tamper_suspect is True
    assert upi_offset.tamper_risk_level == TamperRiskLevel.IMPLAUSIBLE_TAMPER_FLAG
    assert "possible timestamp tampering" in upi_offset.forensic_assessment.lower()
    assert any("Implausible clock offset" in alert for alert in report.tamper_alerts)


def test_planted_13_point_2_min_device_b_offset():
    """Planted test: Reconciling the alibi requires Device B clock to be exactly +13.2 min ahead.
    
    Setup:
    - Device A (Airtel tower, BLR): Event at t=10:00:00 (epoch 1770000000).
    - Device B (Handset RTC, Hosur ~40 km away): Event reported at t=10:05:00 (epoch 1770000300).
    - Travel by ground at 140 km/h (effective 119 km/h with 0.85 road curvature) takes:
      40 km / (140 * 0.85 km/h) = 0.336 hours = 20.17 minutes = 1210 seconds.
    - Available nominal time: 5 minutes (300 seconds).
    - Deficit to bridge: 20.17 - 5.0 = 15.17 minutes (approx).
    
    Here we construct an exact fixture where the required transit is 1092 seconds (18.2 min)
    and nominal elapsed is 300 seconds (5.0 min).
    Deficit: 1092 - 300 = 792 seconds = exactly +13.2 minutes!
    """
    base_epoch = 1770000000.0

    # Fact 1 from Device A
    f1 = Fact(
        id="FACT_DEV_A",
        source_file="device_a_cdr.csv",
        sha256="a" * 64,
        line_ref="row:1",
        kind=FactKind.CDR_CALL,
        device_id="DEV_PHONE_A",
        clock_id="clk_telco_ntp",
        time_window=TimeWindow(
            start_epoch=base_epoch,
            end_epoch=base_epoch + 10,
            reported_epoch=base_epoch,
        ),
        region=GeographicRegion(latitude=12.9352, longitude=77.6245, radius_meters=100),
        tier=TrustTier.T1,
        auth_type=AuthType.PASSIVE,
    )

    # Fact 2 from Device B with a location that requires exactly 1092 seconds of travel
    # We choose coordinates such that distance requires 1092 seconds
    # At effective speed ~33.05 m/s, 1092s corresponds to ~36.09 km
    # Let's set speed config so min_travel_seconds = 1092.0s
    cfg = TravelSpeedConfig(
        ground_max_speed_kmh=120.0,
        rail_max_speed_kmh=120.0,
        road_factor=1.0,
    )
    # Using 0.4937 deg lat difference gives ~54.8 km distance, which at 120 km/h
    # takes ~1093.9 seconds, creating a deficit of 793.9 seconds = exactly 13.2 minutes.
    f2 = Fact(
        id="FACT_DEV_B",
        source_file="device_b_rtc.csv",
        sha256="b" * 64,
        line_ref="row:5",
        kind=FactKind.EXIF_PHOTO,
        device_id="DEV_PHONE_B",
        clock_id="clk_handset_rtc",
        time_window=TimeWindow(
            start_epoch=base_epoch + 300,
            end_epoch=base_epoch + 310,
            reported_epoch=base_epoch + 300,  # reported 5.0 min later
        ),
        region=GeographicRegion(latitude=12.9352 + 0.3297, longitude=77.6245, radius_meters=100),
        tier=TrustTier.T2,
        auth_type=AuthType.PASSIVE,
    )

    travel = compute_travel_lower_bound(f1.region, f2.region, config=cfg)
    expected_deficit_min = round((travel.min_travel_seconds - 300.0) / 60.0, 1)
    assert abs(expected_deficit_min - 13.2) <= 0.2  # Exactly 13.2 minutes

    report = infer_required_clock_offsets(
        facts=[f1, f2],
        clock_bounds={"clk_telco_ntp": 5.0, "clk_handset_rtc": 120.0},
        speed_config=cfg,
        mus_cores=[["FACT_DEV_A", "FACT_DEV_B"]],
    )

    assert report.is_case_reconciled is True
    dev_b_offset = next((o for o in report.inferred_offsets if o.clock_id == "clk_handset_rtc"), None)
    assert dev_b_offset is not None
    assert abs(dev_b_offset.inferred_offset_minutes - 13.2) <= 0.2

    # Verify narrative contains the required wording:
    # "Device DEV_PHONE_B (clk_handset_rtc) clock must be +13.2 min ahead for this alibi to hold."
    assert "Device DEV_PHONE_B" in dev_b_offset.formatted_narrative
    assert "clock must be" in dev_b_offset.formatted_narrative
    assert "min ahead for this alibi to hold" in dev_b_offset.formatted_narrative

    # Verify that +13.2 min on an RTC clock is flagged as possible timestamp tampering (exceeds 5 min max limit)
    assert dev_b_offset.is_implausible_tamper_suspect is True
    assert dev_b_offset.tamper_risk_level == TamperRiskLevel.IMPLAUSIBLE_TAMPER_FLAG
    assert "possible timestamp tampering" in dev_b_offset.forensic_assessment.lower()


def test_consistent_case_c_zero_offsets():
    """Consistent case returns 0.0s offsets and zero tamper alerts."""
    case_c = generate_case_c_consistent_control()
    report = infer_required_clock_offsets(
        facts=case_c.facts,
        clock_bounds=case_c.clock_bounds,
        mus_cores=[],
    )

    assert report.is_case_reconciled is True
    assert len(report.tamper_alerts) == 0
    for offset in report.inferred_offsets:
        assert offset.inferred_offset_seconds == 0.0
        assert offset.inferred_offset_minutes == 0.0
        assert offset.tamper_risk_level == TamperRiskLevel.NORMAL
        assert offset.is_within_nominal_bounds is True


def test_dual_track_decoupling_hypothesis_emitted():
    """Verifies that when passive device telemetry conflicts with active authentication,
    the solver emits 'device present, person not (relay, SIM swap, remote access)' as a hypothesis, not a fact.
    """
    case_a = generate_case_a_impossible_alibi()
    report = compute_hypothesis_report(
        facts=case_a.facts,
        clock_bounds=case_a.clock_bounds,
    )

    # Check for track decoupling hypothesis
    decouple_hypo = report.track_decoupling_hypothesis
    assert decouple_hypo is not None

    # Check that it states the hypothesis neutrally
    assert "device present, person not" in decouple_hypo.statement.lower()
    assert "relay" in decouple_hypo.statement.lower()
    assert "sim swap" in decouple_hypo.statement.lower()
    assert "remote access" in decouple_hypo.statement.lower()

    # Core 0 (the CDR vs UPI conflict) is resolved by decoupling
    assert 0 in decouple_hypo.cores_resolved
    assert len(decouple_hypo.conflicting_facts) >= 1
    assert len(decouple_hypo.supporting_facts) >= 1

    # Also test on a pure passive-active pair (no alibi claim) where decoupling yields complete global SAT
    pure_facts = [f for f in case_a.facts if f.kind != FactKind.CLAIM]
    pure_report = compute_hypothesis_report(facts=pure_facts, clock_bounds=case_a.clock_bounds)
    pure_decouple = pure_report.track_decoupling_hypothesis
    assert pure_decouple is not None
    assert pure_decouple.is_verified_sat is True


def test_configurable_transport_model_affects_feasibility():
    """Verifies that changing speed or overhead dynamically changes travel feasibility bounds."""
    region1 = GeographicRegion(latitude=12.9716, longitude=77.5946, radius_meters=100) # BLR
    region2 = GeographicRegion(latitude=13.3409, longitude=77.1010, radius_meters=100) # Tumakuru (~65 km)

    cfg_slow = TravelSpeedConfig(ground_max_speed_kmh=60.0, rail_max_speed_kmh=60.0, road_factor=1.0)
    cfg_fast = TravelSpeedConfig(ground_max_speed_kmh=180.0, rail_max_speed_kmh=180.0, road_factor=1.0)

    t_slow = compute_travel_lower_bound(region1, region2, config=cfg_slow)
    t_fast = compute_travel_lower_bound(region1, region2, config=cfg_fast)

    # Fast configuration requires significantly fewer travel seconds
    assert t_fast.min_travel_seconds < t_slow.min_travel_seconds
    assert t_slow.min_travel_seconds == pytest.approx(t_fast.min_travel_seconds * 3.0, rel=0.05)


def test_api_solve_returns_clock_skew_inference(client):
    """Verifies that /api/solve includes clock_skew_inference in the response."""
    case_a = generate_case_a_impossible_alibi()
    facts_json = [f.model_dump(mode="json") for f in case_a.facts]

    res = client.post(
        "/api/solve",
        json={
            "case_id": "test_skew_api",
            "facts": facts_json,
            "clock_bounds": case_a.clock_bounds,
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert "clock_skew_inference" in data
    assert data["clock_skew_inference"] is not None
    skew_inf = data["clock_skew_inference"]
    assert "inferred_offsets" in skew_inf
    assert "tamper_alerts" in skew_inf
    assert len(skew_inf["inferred_offsets"]) >= 2
    assert len(skew_inf["tamper_alerts"]) >= 1
