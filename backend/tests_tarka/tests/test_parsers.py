"""Unit tests for Phase 4: Messy Parsers, Rejection Logging, Date Ambiguity, and EXIF Triage.

Forensic Rules Verified:
1. Fact.region is strictly optional (None = unlocated, zero travel constraints, never invent coordinates).
2. Tower coordinates strictly come from operator-supplied tower lookup.
3. Never silently drop rows: exact line numbers and diagnostic reasons in rejected_rows.
4. WhatsApp whole-file date order detection flags ambiguity when all day/month <= 12 rather than guessing.
5. WhatsApp parser handles multiline messages and flags system messages.
6. EXIF triage flags structural anomalies only, using strictly objective, neutral forensic terminology.
"""

from decimal import Decimal
from pathlib import Path
import datetime
import pytest
import z3

from tarka.core.models import FactKind, TrustTier, AuthType, GeographicRegion, TimeWindow, Fact
from tarka.parsers.cdr import CDRParser
from tarka.parsers.bank_upi import BankUPIParser
from tarka.parsers.whatsapp import WhatsAppParser
from tarka.parsers.exif_triage import EXIFTriageParser
from tarka.solver.z3_builder import Z3ConstraintBuilder
from tarka.solver.pairwise_feasibility import check_pairwise_feasibility_pure_python

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_cdr_parser_with_messy_fixture_and_operator_tower_lookup() -> None:
    """CRITICAL REQUIREMENT: Messy CDR parsed with operator tower lookup and line-numbered rejection logging."""
    cdr_file = FIXTURES_DIR / "messy_cdr.csv"
    tower_file = FIXTURES_DIR / "operator_towers.json"

    parser = CDRParser(tower_lookup=tower_file)
    res = parser.parse_file(cdr_file)

    # 1. Total lines read
    assert res.total_lines_read == 7

    # 2. Extracted Facts: Lines 2, 3, 7
    assert len(res.facts) == 3
    f_moc, f_sms, f_data = res.facts[0], res.facts[1], res.facts[2]

    # Line 2: Tower BLR_01 is in operator list
    assert f_moc.id == "FACT_CDR_L2"
    assert f_moc.kind == FactKind.CDR_CALL
    assert f_moc.auth_type == AuthType.ACTIVE
    assert f_moc.region is not None
    assert f_moc.region.latitude == 12.9352
    assert f_moc.region.longitude == 77.6245
    assert f_moc.region.radius_meters == 450.0

    # Line 3: Tower UNLISTED_99 is NOT in operator list -> region MUST be None! Never invent coordinates!
    assert f_sms.id == "FACT_CDR_L3"
    assert f_sms.kind == FactKind.CDR_SMS
    assert f_sms.region is None, "Unlisted tower must leave region as None (never invent coordinates)"
    assert any("TOWER_UNLISTED_99" in w for w in res.warnings)

    # Line 7: Tower BLR_02 is in operator list
    assert f_data.id == "FACT_CDR_L7"
    assert f_data.kind == FactKind.CDR_DATA
    assert f_data.region is not None
    assert f_data.region.latitude == 12.9716

    # 3. Never Silently Drop Rows: Rejections with exact line numbers
    assert len(res.rejected_rows) == 2
    rejections_by_line = {r.line_number: r for r in res.rejected_rows}

    assert 4 in rejections_by_line
    assert "MALFORMED_CORRUPTED_ROW_WITHOUT_COLUMNS" in rejections_by_line[4].raw_content

    assert 6 in rejections_by_line
    assert "BAD_DATE_FORMAT" in rejections_by_line[6].raw_content
    assert "parse datetime" in rejections_by_line[6].reason.lower()

    # 4. Cryptographic integrity: SHA256 digest bound to facts
    assert len(res.source_sha256) == 64
    for f in res.facts:
        assert f.sha256 == res.source_sha256


def test_bank_upi_parser_with_messy_fixture_and_decimal_amounts() -> None:
    """CRITICAL REQUIREMENT: Messy Bank/UPI CSV parsed with Decimal amounts and rejection logging."""
    bank_file = FIXTURES_DIR / "messy_bank_upi.csv"

    parser = BankUPIParser()
    res = parser.parse_file(bank_file)

    assert res.total_lines_read == 7
    # Facts extracted from Lines 2, 3, 5
    assert len(res.facts) == 3

    # Line 2: ₹ 150.00
    f1 = res.facts[0]
    assert f1.id == "FACT_BANK_L2"
    assert f1.kind == FactKind.UPI_PAYMENT
    assert f1.auth_type == AuthType.ACTIVE
    assert isinstance(f1.raw_payload["amount_inr"], Decimal)
    assert f1.raw_payload["amount_inr"] == Decimal("150.00")
    assert f1.region is not None
    assert f1.region.latitude == 12.9352

    # Line 3: Rs. 1,50,000.50 (Indian commas), no coordinates
    f2 = res.facts[1]
    assert f2.id == "FACT_BANK_L3"
    assert isinstance(f2.raw_payload["amount_inr"], Decimal)
    assert f2.raw_payload["amount_inr"] == Decimal("150000.50")
    assert f2.region is None  # No lat/lon provided -> None, never invent coordinates!

    # Line 5: 0.00 INR
    f3 = res.facts[2]
    assert f3.id == "FACT_BANK_L5"
    assert isinstance(f3.raw_payload["amount_inr"], Decimal)
    assert f3.raw_payload["amount_inr"] == Decimal("0.00")

    # Never Silently Drop Rows: Lines 4 and 7 rejected with line numbers
    assert len(res.rejected_rows) == 2
    rej_map = {r.line_number: r for r in res.rejected_rows}

    assert 4 in rej_map
    assert "CORRUPT_NON_CSV_LINE_HERE" in rej_map[4].raw_content

    assert 7 in rej_map
    assert "NOT_A_VALID_DATE_RECORD" in rej_map[7].raw_content
    assert "parse datetime" in rej_map[7].reason.lower()


def test_whatsapp_parser_whole_file_date_ambiguity_widening_and_multiline() -> None:
    """CRITICAL REQUIREMENT: WhatsApp parser detects whole-file date ambiguity, widens window across both readings."""
    ambiguous_file = FIXTURES_DIR / "messy_whatsapp_ambiguous.txt"

    # Default parser: no explicit timezone -> must record warning
    parser_default = WhatsAppParser()
    res = parser_default.parse_file(ambiguous_file)

    assert any("defaulting to Indian Standard Time" in w for w in res.warnings)
    assert res.is_date_ambiguous is True

    # Ambiguous date facts must not enter the solver as definite times:
    # 05/06/2026 can be June 5 (DD/MM) or May 6 (MM/DD). The difference is ~31 days!
    for f in res.facts:
        time_span = f.time_window.end_epoch - f.time_window.start_epoch
        # Spans over 25 days, preventing it from anchoring as a single second
        assert time_span >= 25 * 86400.0, f"Ambiguous fact {f.id} must span both readings ({time_span}s)"

    # Multiline Continuation:
    facts = res.facts
    assert len(facts) == 4

    # Message 1: System message (line 1)
    assert facts[0].raw_payload["is_system_message"] is True
    assert facts[0].device_id == "SENDER_SYSTEM"
    assert facts[0].auth_type == AuthType.PASSIVE

    # Message 2: Rajesh (line 2)
    assert facts[1].raw_payload["sender"] == "Rajesh Sharma"
    assert "where are you meeting" in facts[1].raw_payload["message_text"]

    # Message 3: Vikram (lines 3-5 combined multiline message)
    assert facts[2].raw_payload["sender"] == "Vikram"
    combined_body = facts[2].raw_payload["message_text"]
    assert "Heading towards the Koramangala office" in combined_body
    assert "I will reach in about 20 minutes" in combined_body
    assert "Please keep the project files ready" in combined_body
    assert facts[2].raw_payload["lines_consumed"] == 3

    # Message 4: Rajesh Sharma left (system message, line 6)
    assert facts[3].raw_payload["is_system_message"] is True
    assert "left" in facts[3].raw_payload["message_text"]

    # Explicit timezone suppresses default warning
    parser_explicit = WhatsAppParser(tz=datetime.timezone.utc)
    res_explicit = parser_explicit.parse_file(ambiguous_file)
    assert not any("defaulting to Indian Standard Time" in w for w in res_explicit.warnings)


def test_whatsapp_parser_unambiguous_date() -> None:
    """Verifies that WhatsApp files with day > 12 are marked as unambiguous."""
    unambiguous_file = FIXTURES_DIR / "messy_whatsapp_unambiguous.txt"

    parser = WhatsAppParser()
    res = parser.parse_file(unambiguous_file)

    # Day 26 > 12 -> definitively DD/MM/YYYY, not ambiguous!
    assert res.is_date_ambiguous is False
    assert len(res.facts) >= 2


def test_exif_triage_structural_anomalies_neutral_wording() -> None:
    """CRITICAL REQUIREMENT: EXIF triage flags structural anomalies only, using strictly neutral terminology."""
    parser = EXIFTriageParser()

    # Scenario 1: File Modification Precedes EXIF Original Time (e.g. file copying or clock glitch)
    # Original: 2026-01-26 14:00:00 (epoch: ~1769416200)
    # Mod Time: 2026-01-26 12:00:00 (epoch: 7200s earlier)
    meta_1 = {
        "DateTimeOriginal": "2026:01:26 14:00:00",
        "Model": "Nikon D850",
    }
    rep_1 = parser.triage_metadata(
        metadata=meta_1,
        filename="photo_precedes.jpg",
        fs_modify_epoch=1769416200.0 - 7200.0,
    )
    assert rep_1.has_structural_anomalies is True
    anom_1 = rep_1.structural_anomalies[0]
    assert anom_1.anomaly_code == "ANOMALY_FILE_MODIFY_PRECEDES_ORIGINAL"
    assert anom_1.measured_delta_seconds == pytest.approx(7200.0, abs=10.0)

    # VERIFY STRICT FORENSIC NEUTRALITY IN WORDING
    prohibited_words = ["fake", "forged", "tampered", "culprit", "guilty", "crime", "admissible", "court-ready", "proves identity"]
    for word in prohibited_words:
        assert word not in anom_1.description.lower(), f"Prohibited accusatory term '{word}' found in EXIF report!"

    # Scenario 2: GPS satellite timestamp differs from internal camera RTC timestamp
    meta_2 = {
        "DateTimeOriginal": "2026:01:26 14:00:00",
        "GPSDateStamp": "2026:01:26",
        "GPSTimeStamp": ((14, 1), (10, 1), (0, 1)),  # 10 minutes (600s) discrepancy
    }
    rep_2 = parser.triage_metadata(metadata=meta_2, filename="photo_gps_drift.jpg")
    assert rep_2.has_structural_anomalies is True
    anom_2 = next(a for a in rep_2.structural_anomalies if a.anomaly_code == "ANOMALY_GPS_TIME_DISCREPANCY")
    assert anom_2.measured_delta_seconds is not None
    assert anom_2.measured_delta_seconds > 120.0
    for word in prohibited_words:
        assert word not in anom_2.description.lower()

    # Scenario 3: External photo editing suite signature in Software tag
    meta_3 = {
        "DateTimeOriginal": "2026:01:26 14:00:00",
        "Software": "Adobe Photoshop 25.0 (Windows)",
    }
    rep_3 = parser.triage_metadata(metadata=meta_3, filename="photo_photoshop.jpg")
    assert rep_3.has_structural_anomalies is True
    anom_3 = next(a for a in rep_3.structural_anomalies if a.anomaly_code == "ANOMALY_IMAGE_EDITOR_SIGNATURE")
    for word in prohibited_words:
        assert word not in anom_3.description.lower()


def test_optional_region_zero_travel_constraints() -> None:
    """CRITICAL REQUIREMENT: Unlocated facts (region=None) skip travel constraints entirely."""
    # Fact 1: Located in Bengaluru
    f_located = Fact(
        id="FACT_BLR",
        source_file="cdr.csv",
        sha256="0" * 64,
        line_ref="line:1",
        kind=FactKind.CDR_CALL,
        time_window=TimeWindow(start_epoch=1000.0, end_epoch=1005.0, reported_epoch=1000.0),
        region=GeographicRegion(latitude=12.9716, longitude=77.5946, radius_meters=500.0),
        tier=TrustTier.T1,
        device_id="DEV_1",
        clock_id="clk_1",
        entity_refs=["ENTITY_X"],
        auth_type=AuthType.ACTIVE,
    )

    # Fact 2: Completely unlocated (region=None, e.g. unlisted tower or WhatsApp text)
    # Occurs just 10 seconds later, which would be impossible if located far away
    f_unlocated = Fact(
        id="FACT_UNLOCATED",
        source_file="wa.txt",
        sha256="1" * 64,
        line_ref="line:2",
        kind=FactKind.WA_MESSAGE,
        time_window=TimeWindow(start_epoch=1010.0, end_epoch=1015.0, reported_epoch=1010.0),
        region=None,  # NO REGION!
        tier=TrustTier.T3,
        device_id="DEV_1",
        clock_id="clk_2",
        entity_refs=["ENTITY_X"],
        auth_type=AuthType.ACTIVE,
    )

    # 1. Pure-Python pairwise feasibility check
    # Without region, travel distance cannot be computed -> must evaluate as feasible!
    # Returns (is_feasible, max_available, min_required)
    is_feasible, max_avail_s, req_s = check_pairwise_feasibility_pure_python(
        f_located, f_unlocated, clock_bounds={"clk_1": 5.0, "clk_2": 5.0}
    )
    assert is_feasible is True
    assert req_s == 0.0

    # 2. Z3 solver constraint builder
    builder = Z3ConstraintBuilder()
    solver, lmap, bundle = builder.build_solver(
        [f_located, f_unlocated],
        clock_bounds={"clk_1": 5.0, "clk_2": 5.0},
    )
    # Check that no travel constraint was generated for this pair
    assert bundle.total_pairs_considered == 1
    assert solver.check(builder.get_assumptions_for_facts([f_located, f_unlocated], lmap)) == z3.sat


def test_parsed_plus_rejected_equals_total_data_lines_across_all_fixtures() -> None:
    """CRITICAL FORENSIC CONSERVATION: Every single data line is either parsed into a Fact or recorded in rejected_rows.

    No data lines ever vanish into thin air.
    """
    tower_file = FIXTURES_DIR / "operator_towers.json"

    # 1. Messy CDR CSV (7 total lines: 1 header, 1 blank, 5 data lines)
    cdr_path = FIXTURES_DIR / "messy_cdr.csv"
    with open(cdr_path, "r", encoding="utf-8") as f:
        cdr_raw_lines = [line.strip() for line in f.readlines()]
    cdr_data_lines = [line for line in cdr_raw_lines[1:] if line]  # Exclude header and blank lines
    cdr_res = CDRParser(tower_lookup=tower_file).parse_file(cdr_path)

    cdr_consumed = sum(f.raw_payload.get("lines_consumed", 1) for f in cdr_res.facts)
    cdr_rejected = len(cdr_res.rejected_rows)
    assert cdr_consumed + cdr_rejected == len(cdr_data_lines), (
        f"CDR conservation broken: {cdr_consumed} parsed + {cdr_rejected} rejected != {len(cdr_data_lines)} data lines"
    )

    # 2. Messy Bank / UPI CSV (7 total lines: 1 header, 1 blank, 5 data lines)
    bank_path = FIXTURES_DIR / "messy_bank_upi.csv"
    with open(bank_path, "r", encoding="utf-8") as f:
        bank_raw_lines = [line.strip() for line in f.readlines()]
    bank_data_lines = [line for line in bank_raw_lines[1:] if line]
    bank_res = BankUPIParser().parse_file(bank_path)

    bank_consumed = sum(f.raw_payload.get("lines_consumed", 1) for f in bank_res.facts)
    bank_rejected = len(bank_res.rejected_rows)
    assert bank_consumed + bank_rejected == len(bank_data_lines), (
        f"Bank conservation broken: {bank_consumed} parsed + {bank_rejected} rejected != {len(bank_data_lines)} data lines"
    )

    # 3. Messy WhatsApp Ambiguous (6 physical lines, multiline messages)
    wa_amb_path = FIXTURES_DIR / "messy_whatsapp_ambiguous.txt"
    with open(wa_amb_path, "r", encoding="utf-8") as f:
        wa_amb_raw = [line.strip() for line in f.readlines()]
    wa_amb_data_lines = [line for line in wa_amb_raw if line]
    wa_amb_res = WhatsAppParser().parse_file(wa_amb_path)

    wa_amb_consumed = sum(f.raw_payload.get("lines_consumed", 1) for f in wa_amb_res.facts)
    wa_amb_rejected = len(wa_amb_res.rejected_rows)
    assert wa_amb_consumed + wa_amb_rejected == len(wa_amb_data_lines), (
        f"WA Ambiguous conservation broken: {wa_amb_consumed} parsed + {wa_amb_rejected} rejected != {len(wa_amb_data_lines)}"
    )

    # 4. Messy WhatsApp Unambiguous (5 physical lines, multiline messages)
    wa_unamb_path = FIXTURES_DIR / "messy_whatsapp_unambiguous.txt"
    with open(wa_unamb_path, "r", encoding="utf-8") as f:
        wa_unamb_raw = [line.strip() for line in f.readlines()]
    wa_unamb_data_lines = [line for line in wa_unamb_raw if line]
    wa_unamb_res = WhatsAppParser().parse_file(wa_unamb_path)

    wa_unamb_consumed = sum(f.raw_payload.get("lines_consumed", 1) for f in wa_unamb_res.facts)
    wa_unamb_rejected = len(wa_unamb_res.rejected_rows)
    assert wa_unamb_consumed + wa_unamb_rejected == len(wa_unamb_data_lines), (
        f"WA Unambiguous conservation broken: {wa_unamb_consumed} parsed + {wa_unamb_rejected} rejected != {len(wa_unamb_data_lines)}"
    )


def test_exif_timezone_naive_and_differs_from_wording() -> None:
    """CRITICAL REQUIREMENT: EXIF timezone-naive handling and strictly 'differs from / consistent with' phrasing."""
    # 1. EXIF parser defaulted timezone emits audit warning
    parser_default = EXIFTriageParser()
    rep = parser_default.triage_metadata(
        metadata={"DateTimeOriginal": "2026:01:26 14:00:00"},
        filename="test.jpg",
    )
    assert any("defaulting to Indian Standard Time" in note for note in rep.audit_notes)
    assert any("timezone-naive" in note for note in rep.audit_notes)

    # 2. Explicit timezone suppresses default warning
    parser_explicit = EXIFTriageParser(tz=datetime.timezone.utc)
    rep_exp = parser_explicit.triage_metadata(
        metadata={"DateTimeOriginal": "2026:01:26 14:00:00", "OffsetTimeOriginal": "+05:30"},
        filename="test.jpg",
    )
    assert not any("defaulting to Indian Standard Time" in note for note in rep_exp.audit_notes)
    # Offset was explicit (+05:30) so not timezone-naive
    assert not any("timezone-naive" in note for note in rep_exp.audit_notes)

    # 3. Phrasing verification: strictly 'differs from' and 'consistent with'
    rep_anom = parser_default.triage_metadata(
        metadata={
            "DateTimeOriginal": "2026:01:26 14:00:00",
            "Software": "Adobe Photoshop CC",
        },
        fs_modify_epoch=1769416200.0 - 500.0,
    )
    assert len(rep_anom.structural_anomalies) >= 2
    for anom in rep_anom.structural_anomalies:
        desc = anom.description.lower()
        assert "differs from" in desc
        assert "consistent with" in desc
        assert "fake" not in desc
        assert "forged" not in desc
        assert "tampered" not in desc


def test_whatsapp_orphan_line_and_malformed_header_rejections() -> None:
    """CRITICAL REQUIREMENT: WhatsApp export with orphan line before first header and malformed header."""
    p = FIXTURES_DIR / "messy_whatsapp_orphan_and_malformed.txt"
    parser = WhatsAppParser()
    res = parser.parse_file(p)

    assert res.total_lines_read == 4
    assert len(res.facts) == 2
    assert len(res.rejected_rows) == 2

    rej_map = {r.line_number: r for r in res.rejected_rows}

    # Line 1: Orphan text line before first timestamp header
    assert 1 in rej_map
    assert "THIS_IS_AN_ORPHAN_LINE" in rej_map[1].raw_content
    assert "orphan" in rej_map[1].reason.lower()

    # Line 3: Malformed timestamp header with impossible month 99
    assert 3 in rej_map
    assert "Bad Header" in rej_map[3].raw_content
    assert "parse timestamp" in rej_map[3].reason.lower()

    # Conservation check: 2 facts + 2 rejected rows = 4 total data lines
    consumed = sum(f.raw_payload.get("lines_consumed", 1) for f in res.facts)
    assert consumed + len(res.rejected_rows) == 4


def test_compute_travel_lower_bound_against_hand_computed_formula() -> None:
    """CRITICAL REQUIREMENT: Validates compute_travel_lower_bound against hand-computed formula with explicit constants.

    Constants:
      Earth radius R = 6371.0088 km
      Point 1 (Bengaluru MG Road): lat1 = 12.9716, lon1 = 77.5946, radius1 = 0.5 km (500m)
      Point 2 (Bengaluru Airport corridor): lat2 = 13.1000, lon2 = 77.5946, radius2 = 0.5 km (500m)
      Identical longitude => Great-circle arc is pure latitude difference:
        delta_lat_deg = 13.1000 - 12.9716 = 0.1284 deg
        delta_lat_rad = 0.1284 * pi / 180 = 0.0022410027 rad
        haversine_dist = R * delta_lat_rad = 6371.0088 * 0.0022410027 = 14.277448 km
      Effective distance (minus uncertainty radii 0.5 + 0.5 = 1.0 km):
        eff_dist = 14.277448 - 1.0 = 13.277448 km
      Mode feasibility:
        Air: Ineligible because eff_dist (13.28 km) < air_min_distance_km (80.0 km)
        Ground: max speed 140 km/h with road factor 0.85 => 140 / 0.85 = 164.70588 km/h
                t_ground = (13.277448 / 164.70588) * 3600 = 290.21 seconds
        Rail: max speed 180 km/h = 180 / 3600 = 0.05 km/s
              t_rail = 13.277448 / 0.05 = 265.55 seconds
      Fastest lower bound: RAIL at 265.55 seconds.
    """
    from tarka.core.travel import compute_travel_lower_bound, TravelSpeedConfig

    r1 = GeographicRegion(latitude=12.9716, longitude=77.5946, radius_meters=500.0)
    r2 = GeographicRegion(latitude=13.1000, longitude=77.5946, radius_meters=500.0)

    # Hand-computed constants explicitly defined in test
    EARTH_RADIUS_KM = 6371.0088
    DELTA_LAT_DEG = 13.1000 - 12.9716
    DELTA_LAT_RAD = DELTA_LAT_DEG * 3.141592653589793 / 180.0
    HAND_HAVERSINE_KM = EARTH_RADIUS_KM * DELTA_LAT_RAD
    COMBINED_RADII_KM = (500.0 + 500.0) / 1000.0
    HAND_EFF_DIST_KM = HAND_HAVERSINE_KM - COMBINED_RADII_KM
    RAIL_SPEED_KM_PER_SEC = 180.0 / 3600.0
    HAND_MIN_TRAVEL_SEC = HAND_EFF_DIST_KM / RAIL_SPEED_KM_PER_SEC

    res = compute_travel_lower_bound(r1, r2)

    assert round(res.haversine_distance_km, 4) == round(HAND_HAVERSINE_KM, 4)
    assert round(res.effective_distance_km, 4) == round(HAND_EFF_DIST_KM, 4)
    assert round(res.min_travel_seconds, 2) == round(HAND_MIN_TRAVEL_SEC, 2)
    assert res.governing_mode == "RAIL"
    assert res.min_travel_seconds == pytest.approx(265.55, abs=0.05)
