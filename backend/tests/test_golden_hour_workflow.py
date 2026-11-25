"""Golden-hour workflow tests: NCRP CSV import/matching, Bank Reply Loop (RELEASED), Case Handover, Demo seed."""

from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.ncrp_complaints import (
    NcrpComplaintStore,
    match_complaint_to_case,
    parse_ncrp_csv,
)
from app.services.ingestion.networks import case_networks
from app.services.ingestion.projects_store import ProjectsStore
from app.api.freeze_notices_api import TRANSITIONS, NoticeStatusRequest
from pydantic import ValidationError


def test_ncrp_csv_parse_preserves_blanks_never_invents():
    csv_text = (
        "Ack No.,Victim Name,Phone,Account/VPA,Amount,Date/Time,Typology\n"
        "NCRP-101,Asha Devi,,asha@oksbi,75000,2026-09-10 09:05:00,UPI Fraud\n"
        "NCRP-102,,9811223344,,,\n"
    )
    rows = parse_ncrp_csv(csv_text)
    assert len(rows) == 2
    assert rows[0]["ack_no"] == "NCRP-101"
    assert rows[0]["phone"] == ""
    assert rows[0]["amount_inr"] == 75000.0
    assert rows[0]["complaint_ts"] is not None
    # Blank row fields remain empty / None, never fabricated
    assert rows[1]["victim_name"] == ""
    assert rows[1]["account_vpa"] == ""
    assert rows[1]["amount_inr"] is None
    assert rows[1]["complaint_ts"] is None
    assert rows[1]["typology"] == ""


def test_ncrp_match_matched_and_unmatched_reasons(tmp_path: Path):
    derived_dir = tmp_path / "derived"
    case_id = f"CASE-NCRP-{uuid.uuid4().hex[:6]}"
    case_dir = derived_dir / case_id
    case_dir.mkdir(parents=True)

    bank_csv = tmp_path / "stmt.csv"
    bank_csv.write_text(
        "txn_date,txn_time,payer,payee,amount,rrn\n"
        "10/09/2026,09:05:00,victim.alpha@oksbi,mule.one@ybl,85000,900000000001\n"
        "10/09/2026,09:30:00,mule.one@ybl,ATM CASH WITHDRAWAL NOIDA,80000,900000000002\n",
        encoding="utf-8",
    )
    DerivedStore(case_dir).ingest_bank_csv("JOB-1", bank_csv)
    nets = case_networks(derived_dir, case_id)

    matched = match_complaint_to_case(
        derived_dir,
        case_id,
        {
            "ack_no": "NCRP-M1",
            "victim_name": "Alpha Victim",
            "phone": "",
            "account_vpa": "victim.alpha@oksbi",
            "amount_inr": 85000.0,
            "complaint_ts": datetime(2026, 9, 10, 9, 5, 0).timestamp(),
            "typology": "UPI Fraud",
        },
        nets,
    )
    assert matched["status"] == "MATCHED"
    assert matched["matched_account"] == "victim.alpha@oksbi"
    assert len(matched["matched_txns"]) == 1

    # Unmatched account gets explicit reason
    unmatched = match_complaint_to_case(
        derived_dir,
        case_id,
        {
            "ack_no": "NCRP-U1",
            "victim_name": "Nobody",
            "phone": "",
            "account_vpa": "nobody@okaxis",
            "amount_inr": 10000.0,
            "complaint_ts": None,
            "typology": "",
        },
        nets,
    )
    assert unmatched["status"] == "UNMATCHED"
    assert "nobody@okaxis" in unmatched["match_reason"]

    # Out-of-window complaint returns honest window reason
    out_of_win = match_complaint_to_case(
        derived_dir,
        case_id,
        {
            "ack_no": "NCRP-U2",
            "victim_name": "Alpha Victim",
            "phone": "",
            "account_vpa": "victim.alpha@oksbi",
            "amount_inr": 85000.0,
            "complaint_ts": datetime(2026, 12, 1, 9, 0, 0).timestamp(),
            "typology": "",
        },
        nets,
    )
    assert out_of_win["status"] == "UNMATCHED"
    assert "±72 hours" in out_of_win["match_reason"]


def test_golden_hour_step_timings_recorded(tmp_path: Path):
    store = NcrpComplaintStore(tmp_path)
    case_id = "CASE-GH-1"
    store.mark_golden_step(case_id, "complaint_received_at", 1000.0, complaint_ts=900.0)
    store.mark_golden_step(case_id, "uploaded_at", 1015.0)
    store.mark_golden_step(case_id, "traced_at", 1042.0)
    store.mark_golden_step(case_id, "mules_found_at", 1045.0)
    store.mark_golden_step(case_id, "freeze_drafted_at", 1090.0)
    status = store.golden_hour_status(case_id)
    assert status["active"] is True
    assert status["total_elapsed_secs"] == 90.0
    assert [s["elapsed_secs"] for s in status["steps"]] == [0.0, 15.0, 42.0, 45.0, 90.0]


def test_freeze_notice_released_transition_and_note():
    assert "RELEASED" in TRANSITIONS["FROZEN"]
    assert TRANSITIONS["RELEASED"] == set()
    req = NoticeStatusRequest(status="RELEASED", note="Released on Magistrate order §497 BNSS")
    assert req.status == "RELEASED"
    try:
        NoticeStatusRequest(status="INVALID")  # type: ignore[arg-type]
        assert False, "Expected validation error"
    except ValidationError:
        pass


def test_case_handover_hash_chain_and_network_assignee(tmp_path: Path):
    ps = ProjectsStore(tmp_path)
    p = ps.create("Op Handover", "", "insp.one")
    c = ps.register_case("insp.one", "Test Case", p["project_id"], {})
    cid = c["case_id"]

    h1 = ps.handover(cid, "SI Kavita Nair", "insp.one", note="Initial triage done, freeze queued.")
    assert h1["handover"]["from_officer"] is None
    assert h1["handover"]["to_officer"] == "SI Kavita Nair"
    assert ps.case_meta(cid)["assignee"] == "SI Kavita Nair"

    h2 = ps.handover(cid, "Insp. Vikram Rathore", "SI Kavita Nair", note="Court report pending HI review.")
    assert h2["handover"]["from_officer"] == "SI Kavita Nair"
    assert len(h2["history"]) == 2
    assert h2["history"][0]["hash"] != h2["history"][1]["hash"]

    hn = ps.handover(cid, "SI Meera Joshi", "Insp. Vikram Rathore", note="Take NET-001 device follow-up", network_id="NET-001")
    assert hn["handover"]["network_id"] == "NET-001"
    assert ps.network_assignees(cid) == {"NET-001": "SI Meera Joshi"}
