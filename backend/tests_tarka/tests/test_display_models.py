"""Unit tests for Checkpoint U1: Human-Readable Events & Display Models.

Verifies:
1. One-line title generation from templates across all FactKind types.
2. Local IST time formatting (e.g. "2:15 PM IST, 12 Mar").
3. Source label badge resolution (Airtel, SBI, WhatsApp, etc.).
4. Place name resolution from coordinates.
5. Timeline lane allocation (Phone activity vs Person actions).
6. Clock uncertainty tooltips.
7. Technical details drawer isolation (raw IDs isolated).
"""

from __future__ import annotations

import pytest

from tarka.core.models import (
    Fact,
    FactKind,
    TrustTier,
    AuthType,
    TimeWindow,
    GeographicRegion,
)
from tarka.core.display import (
    build_fact_display_model,
    generate_event_title,
    resolve_place_name,
    resolve_source_label,
    format_epoch_to_local_ist,
    format_uncertainty_tooltip,
)
from tarka.generator.synthetic_cases import (
    generate_case_a_impossible_alibi,
    generate_case_c_consistent_control,
)


def test_title_templates_across_all_fact_kinds():
    """Verifies that every FactKind produces a human-readable, non-technical title."""
    # 1. CDR Call
    t_cdr_out = generate_event_title(FactKind.CDR_CALL, "Koramangala, Bengaluru", {"call_type": "outgoing"})
    assert "Outgoing phone call via Koramangala, Bengaluru tower" in t_cdr_out
    assert "FACT_" not in t_cdr_out

    t_cdr_in = generate_event_title(FactKind.CDR_CALL, "Connaught Place, New Delhi", {"call_type": "incoming"})
    assert "Incoming phone call via Connaught Place, New Delhi tower" in t_cdr_in

    t_cdr_gen = generate_event_title(FactKind.CDR_CALL, "Bandra, Mumbai", {})
    assert "Phone connected to Bandra, Mumbai tower" in t_cdr_gen

    # 2. CDR SMS
    t_sms = generate_event_title(FactKind.CDR_SMS, "Panaji, Goa", {})
    assert "SMS transmitted via Panaji, Goa tower" in t_sms

    # 3. CDR Data
    t_data = generate_event_title(FactKind.CDR_DATA, "Park Street, Kolkata", {})
    assert "Cellular data session active in Park Street, Kolkata" in t_data

    # 4. UPI Payment
    t_upi = generate_event_title(FactKind.UPI_PAYMENT, "Connaught Place, New Delhi", {"amount": 5000, "payee_vpa": "merchant@icici"})
    assert "UPI payment of ₹5,000 to merchant@icici sent in Connaught Place, New Delhi" in t_upi

    # 5. Bank Transaction
    t_bank_atm = generate_event_title(FactKind.BANK_TXN, "Howrah, Kolkata", {"type": "ATM_WITHDRAWAL", "amount": 10000})
    assert "ATM cash withdrawal of ₹10,000 in Howrah, Kolkata" in t_bank_atm

    t_bank_gen = generate_event_title(FactKind.BANK_TXN, "Mysuru", {"amount": 1250})
    assert "Bank transaction of ₹1,250 recorded in Mysuru" in t_bank_gen

    # 6. WhatsApp Message
    t_wa = generate_event_title(FactKind.WA_MESSAGE, "Guwahati", {"sender": "Vikram"})
    assert "WhatsApp message from Vikram in Guwahati" in t_wa

    # 7. EXIF Photo
    t_photo = generate_event_title(FactKind.EXIF_PHOTO, "Indiranagar, Bengaluru", {"camera_model": "Pixel 8"})
    assert "Photo captured with Pixel 8 in Indiranagar, Bengaluru" in t_photo

    # 8. Alibi Claim
    t_claim = generate_event_title(FactKind.CLAIM, "Koramangala, Bengaluru", {"claimant": "Rajesh Sharma"})
    assert "Rajesh Sharma claims presence in Koramangala, Bengaluru" in t_claim


def test_local_ist_time_formatting():
    """Verifies that epoch seconds convert accurately to local IST strings."""
    import datetime
    from tarka.core.timezones import IST_TIMEZONE
    
    # 2:15 PM IST on 12 Mar 2026 (exact example from prompt)
    dt = datetime.datetime(2026, 3, 12, 14, 15, tzinfo=IST_TIMEZONE)
    epoch = dt.timestamp()
    t_disp, t_short, d_disp = format_epoch_to_local_ist(epoch)

    assert "IST" in t_disp
    assert "12 Mar 2026" in t_disp
    assert "2:15 PM" in t_disp
    assert t_short == "2:15 PM"
    assert d_disp == "12 Mar 2026"
    assert t_disp == "2:15 PM IST, 12 Mar 2026"



def test_source_label_resolution():
    """Verifies resolution of realistic source files to human-readable badges."""
    assert resolve_source_label("airtel_cdr_dump_2026.csv", FactKind.CDR_CALL) == "Airtel call records"
    assert resolve_source_label("jio_tower_pings.csv", FactKind.CDR_DATA) == "Jio call records"
    assert resolve_source_label("sbi_savings_statement.pdf", FactKind.BANK_TXN) == "SBI bank statement"
    assert resolve_source_label("hdfc_upi_logs.csv", FactKind.UPI_PAYMENT) == "HDFC Bank statement"
    assert resolve_source_label("WhatsApp Chat with Vikram.txt", FactKind.WA_MESSAGE) == "WhatsApp chat export"
    assert resolve_source_label("suspect_alibi_deposition.txt", FactKind.CLAIM) == "Witness statement"
    assert resolve_source_label("evidence_photo.jpg", FactKind.EXIF_PHOTO) == "Photo metadata (EXIF)"


def test_place_name_resolution():
    """Verifies spatial coordinates resolve to recognizable landmarks."""
    # Bangalore Koramangala
    blr_kora = GeographicRegion(latitude=12.9352, longitude=77.6245, radius_meters=200)
    assert resolve_place_name(blr_kora) == "Koramangala, Bengaluru"

    # Delhi Connaught Place
    del_cp = GeographicRegion(latitude=28.6315, longitude=77.2167, radius_meters=100)
    assert resolve_place_name(del_cp) == "Connaught Place, New Delhi"

    # Goa Panaji
    goa = GeographicRegion(latitude=15.4909, longitude=73.8278, radius_meters=500)
    assert resolve_place_name(goa) == "Panaji, Goa"

    # None location
    assert resolve_place_name(None) == "Location not recorded"


def test_fact_display_model_on_case_a():
    """Verifies complete FactDisplayModel generation on Case A impossible alibi."""
    case_a = generate_case_a_impossible_alibi()
    assert len(case_a.facts) >= 2

    # Fact 1: Bengaluru CDR
    f1 = case_a.facts[0]
    m1 = build_fact_display_model(f1, case_a.clock_bounds)

    assert "Phone connected to" in m1.title or "call" in m1.title.lower()
    assert "Bengaluru" in m1.place_name
    assert m1.lane == "Phone activity"
    assert m1.lane_id == "phone"
    assert "Airtel" in m1.source_label or "call" in m1.source_label.lower()
    assert "IST" in m1.time_display
    assert "Clock uncertainty" in m1.uncertainty_tooltip

    # Raw identifiers live ONLY in technical_details
    assert m1.technical_details.fact_id == f1.id
    assert m1.technical_details.clock_id == f1.clock_id
    assert m1.technical_details.device_id == f1.device_id
    assert m1.technical_details.sha256 == f1.sha256
    assert "FACT_" not in m1.title
    assert "clk_" not in m1.title

    # Fact 2: Delhi UPI
    f2 = case_a.facts[1]
    m2 = build_fact_display_model(f2, case_a.clock_bounds)

    assert "UPI" in m2.title
    assert "Delhi" in m2.place_name
    assert m2.lane == "Person actions"
    assert m2.lane_id == "person"
    assert "SBI" in m2.source_label or "UPI" in m2.source_label
    assert "FACT_" not in m2.title


def test_uncertainty_tooltip_formatting():
    """Verifies user-friendly clock uncertainty tooltip strings."""
    assert format_uncertainty_tooltip(5.0) == "Clock uncertainty ±5 sec"
    assert format_uncertainty_tooltip(120.0) == "Clock uncertainty ±2 min"
    assert format_uncertainty_tooltip(300.0) == "Clock uncertainty ±5 min"
    assert format_uncertainty_tooltip(90.0) == "Clock uncertainty ±1.5 min"


def test_missing_timestamp_display_and_serialization():
    """DATA-03: Verifies that missing timestamp exposes is_timestamp_missing=True, placeholder strings, and serializes cleanly."""
    fact_missing = Fact(
        id="FACT-MISSING-01",
        source_file="unknown_bitstream.png",
        sha256="a" * 64,
        line_ref="byte:0",
        kind=FactKind.CLAIM,
        time_window=TimeWindow(start_epoch=0.0, end_epoch=0.0, reported_epoch=0.0),
        region=None,
        tier=TrustTier.T3,
        auth_type=AuthType.PASSIVE,
        device_id="DEV_TEST",
        clock_id="clk_case",
        raw_payload={"is_timestamp_missing": True},
    )

    model = build_fact_display_model(fact_missing, {"clk_case": 120.0})

    assert model.is_timestamp_missing is True
    assert model.time_display == "Timestamp not recorded"
    assert model.time_short == "N/A"
    assert model.date_display == "Date not recorded"

    # API serialization check
    dump_dict = model.model_dump()
    assert dump_dict["is_timestamp_missing"] is True
    assert dump_dict["time_display"] == "Timestamp not recorded"
    assert dump_dict["time_short"] == "N/A"
    assert dump_dict["date_display"] == "Date not recorded"

    json_str = model.model_dump_json()
    assert '"is_timestamp_missing":true' in json_str or '"is_timestamp_missing": true' in json_str


def test_genuine_epoch_zero_vs_missing_timestamp():
    """DATA-03: Verifies that genuine Unix epoch zero is preserved as valid timestamp (1 Jan 1970) and not marked missing."""
    fact_epoch_zero = Fact(
        id="FACT-GENUINE-EPOCH-0",
        source_file="legacy_log_1970.txt",
        sha256="b" * 64,
        line_ref="line:1",
        kind=FactKind.BANK_TXN,
        time_window=TimeWindow(start_epoch=0.0, end_epoch=0.0, reported_epoch=0.0),
        region=None,
        tier=TrustTier.T1,
        auth_type=AuthType.ACTIVE,
        device_id="DEV_1970",
        clock_id="clk_case",
        raw_payload={"is_timestamp_missing": False},
    )

    model = build_fact_display_model(fact_epoch_zero, {"clk_case": 120.0})

    assert model.is_timestamp_missing is False
    assert model.time_display == "5:30 AM IST, 1 Jan 1970"
    assert model.time_short == "5:30 AM"
    assert model.date_display == "1 Jan 1970"

