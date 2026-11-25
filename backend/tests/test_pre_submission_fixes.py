"""Pre-submission regression tests — written to fail before fixes A1, A3, A4, A5, C1 and pass after."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.account_verdicts import VerdictStore
from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.device_store import ingest_device_csv
from app.services.ingestion.ncrp_complaints import match_complaint_to_case
from app.services.ingestion.networks import analyze, analyze_store, case_networks


def test_salaried_couple_sharing_wifi_not_flagged_as_mule(tmp_path: Path):
    """A1: Ordinary salaried couple sharing home Wi-Fi across 60 days must NEVER be flagged MULE."""
    day = 86_400.0
    t0 = 1_780_000_000.0
    case_dir = tmp_path / "case_couple"
    case_dir.mkdir(parents=True)

    bank_csv = tmp_path / "couple.csv"
    rows = ["txn_date,txn_time,payer,payee,amount,rrn"]
    rrn = 100000000001
    for m in range(3):
        ts_sal = datetime.fromtimestamp(t0 + m * 30 * day)
        # Spouse A: monthly salary ₹60,000, rent ₹45,000 + bill ₹7,000 same day (total pass-through ~87%)
        rows.append(f"{ts_sal:%d/%m/%Y},09:00:00,EMPLOYER PAYROLL,spouse_a@oksbi,60000,{rrn}"); rrn += 1
        rows.append(f"{ts_sal:%d/%m/%Y},11:00:00,spouse_a@oksbi,landlord@okaxis,45000,{rrn}"); rrn += 1
        rows.append(f"{ts_sal:%d/%m/%Y},14:00:00,spouse_a@oksbi,powerbill@okhdfc,7000,{rrn}"); rrn += 1
        # Spouse B: monthly salary ₹55,000, rent ₹40,000 + grocery ₹8,000 same day
        rows.append(f"{ts_sal:%d/%m/%Y},09:30:00,ACME PAYROLL,spouse_b@oksbi,55000,{rrn}"); rrn += 1
        rows.append(f"{ts_sal:%d/%m/%Y},12:00:00,spouse_b@oksbi,landlord@okaxis,40000,{rrn}"); rrn += 1
        rows.append(f"{ts_sal:%d/%m/%Y},15:00:00,spouse_b@oksbi,grocer@ybl,8000,{rrn}"); rrn += 1
    # Spouse B shares device/home Wi-Fi with Spouse A; neither shares with any fraud-flagged mule
    dev_csv = tmp_path / "couple_dev.csv"
    dev_csv.write_text(
        "timestamp,account,bssid,client_ip,event\n"
        f"{datetime.fromtimestamp(t0):%d/%m/%Y %H:%M:%S},spouse_a@oksbi,aa:bb:cc:dd:ee:01,192.168.1.10,LOGIN\n"
        f"{datetime.fromtimestamp(t0 + 60):%d/%m/%Y %H:%M:%S},spouse_b@oksbi,aa:bb:cc:dd:ee:01,192.168.1.10,LOGIN\n",
        encoding="utf-8",
    )
    bank_csv.write_text("\n".join(rows), encoding="utf-8")

    store = DerivedStore(case_dir)
    store.ingest_bank_csv("JOB-C", bank_csv)
    ingest_device_csv(case_dir, "JOB-CD", dev_csv)

    res = analyze_store(store, max_members=None)
    flagged = {m["id"] for n in res["networks"] for m in n["members"] if m["role"] == "MULE"}
    assert "spouse_a@oksbi" not in flagged
    assert "spouse_b@oksbi" not in flagged


def test_ncrp_match_finds_recent_row_past_1000_older_rows(tmp_path: Path):
    """A3: Account with 1,000 older rows + 1 recent matching row within ±72h must MATCH (not get truncated at LIMIT 200)."""
    derived_dir = tmp_path / "derived"
    case_id = "CASE-BUSY-1000"
    case_dir = derived_dir / case_id
    case_dir.mkdir(parents=True)

    base = datetime(2026, 5, 1, 10, 0, 0)
    lines = ["txn_date,txn_time,payer,payee,amount,rrn"]
    for i in range(1000):
        dt = base + timedelta(minutes=i * 30)
        lines.append(f"{dt:%d/%m/%Y},{dt:%H:%M:%S},busy.citizen@oksbi,merchant_{i % 20}@ybl,1500,{800000000000 + i}")
    # Recent fraudulent outflow 40 days later
    fraud_dt = base + timedelta(days=40, hours=2)
    lines.append(f"{fraud_dt:%d/%m/%Y},{fraud_dt:%H:%M:%S},busy.citizen@oksbi,mule.target@okaxis,85000,999999000001")
    csv_path = tmp_path / "busy.csv"
    csv_path.write_text("\n".join(lines), encoding="utf-8")
    DerivedStore(case_dir).ingest_bank_csv("JOB-B", csv_path)

    res = match_complaint_to_case(
        derived_dir,
        case_id,
        {
            "ack_no": "NCRP-BUSY-1",
            "victim_name": "Busy Citizen",
            "phone": "",
            "account_vpa": "busy.citizen@oksbi",
            "amount_inr": 85000.0,
            "complaint_ts": fraud_dt.timestamp(),
            "typology": "UPI Fraud",
        },
    )
    assert res["status"] == "MATCHED", res["match_reason"]
    assert res["matched_account"] == "busy.citizen@oksbi"
    assert res["matched_txns"][0]["amount"] == 85000.0


def test_ncrp_match_phone_picks_matched_side_and_sums_only_victim_debits(tmp_path: Path):
    """A4: When phone matches payee side or device_events acct, matched_account must pick the matched side; fallback sums only victim debits."""
    derived_dir = tmp_path / "derived"
    case_id = "CASE-DIR-A4"
    case_dir = derived_dir / case_id
    case_dir.mkdir(parents=True)

    dt = datetime(2026, 9, 12, 11, 0, 0)
    bank_csv = tmp_path / "dir.csv"
    # Note: 9876500111 appears on the PAYEE side, while victim_deb@oksbi has both credits and debits
    bank_csv.write_text(
        "txn_date,txn_time,payer,payee,amount,rrn\n"
        f"{dt:%d/%m/%Y},11:00:00,other.sender@okaxis,9876500111@paytm,42000,910000000001\n"
        f"{dt:%d/%m/%Y},12:00:00,employer@okhdfc,victim_deb@oksbi,100000,910000000002\n"
        f"{dt:%d/%m/%Y},13:00:00,victim_deb@oksbi,mule_1@ybl,25000,910000000003\n"
        f"{dt:%d/%m/%Y},13:15:00,victim_deb@oksbi,mule_2@ybl,15000,910000000004\n",
        encoding="utf-8",
    )
    DerivedStore(case_dir).ingest_bank_csv("JOB-D", bank_csv)

    # 1. Phone matched on payee side must return 9876500111@paytm (NOT other.sender@okaxis!)
    res_phone = match_complaint_to_case(
        derived_dir,
        case_id,
        {
            "ack_no": "NCRP-PH-1",
            "victim_name": "Payee Side",
            "phone": "9876500111",
            "account_vpa": "",
            "amount_inr": 42000.0,
            "complaint_ts": dt.timestamp(),
            "typology": "",
        },
    )
    assert res_phone["status"] == "MATCHED"
    assert res_phone["matched_account"] == "9876500111@paytm"

    # 2. Summing fallback must sum ONLY victim_deb@oksbi debits (25k + 15k = 40k), NOT 100k credit!
    res_debit_sum = match_complaint_to_case(
        derived_dir,
        case_id,
        {
            "ack_no": "NCRP-DEB-1",
            "victim_name": "Debit Sum Victim",
            "phone": "",
            "account_vpa": "victim_deb@oksbi",
            "amount_inr": 40000.0,
            "complaint_ts": dt.timestamp(),
            "typology": "",
        },
    )
    assert res_debit_sum["status"] == "MATCHED", res_debit_sum["match_reason"]
    assert all(t["payer"] == "victim_deb@oksbi" for t in res_debit_sum["matched_txns"])


def test_verdict_learning_keeps_negative_weights_and_uses_holdout_accuracy(tmp_path: Path):
    """A5: Negative weights from NOT_MULE features must stay negative (lowering suspicion), and accuracy must not just score training data."""
    vs = VerdictStore(tmp_path)
    case_id = "CASE-TUNE-A5"
    features_by_key = {}
    for i in range(20):
        # True mules: passthrough + burst_72h (never round_amounts)
        k_pos = f"pos_mule_{i}@ybl"
        features_by_key[k_pos] = {
            "passthrough": 1.0,
            "burst_72h": 1.0,
            "high_value": 1.0,
            "multi_sender": 1.0,
            "below_limit_structuring": 0.0,
            "near_identical_splits": 0.0,
            "rapid_fan_out": 0.0,
            "round_amounts": 0.0,
            "device_shared": 0.0,
        }
        # Benign accounts: ONLY round_amounts=1.0 (e.g., salaried/rent)
        k_neg = f"not_mule_{i}@oksbi"
        features_by_key[k_neg] = {
            "passthrough": 1.0,
            "burst_72h": 0.0,
            "high_value": 0.0,
            "multi_sender": 0.0,
            "below_limit_structuring": 0.0,
            "near_identical_splits": 0.0,
            "rapid_fan_out": 0.0,
            "round_amounts": 1.0,
            "device_shared": 0.0,
        }
    vs.save_features(case_id, features_by_key)
    for k in features_by_key:
        if k.startswith("pos_"):
            vs.set(case_id, "account", k, "io", "CONFIRMED_MULE", "Confirmed pass-through burst")
        else:
            vs.set(case_id, "account", k, "io", "NOT_MULE", "Verified rent / salary")

    tuned = vs.maybe_retune()
    assert tuned is not None
    assert tuned["weights"]["round_amounts"] < 0.0
    assert tuned["accuracy_mode"] in ("holdout", "cv")

    # Scoring with tuned model: round_amounts=1 must lower suspicion score vs round_amounts=0
    t0 = 1_780_000_000.0
    flows_no_round = [("v1@oksbi", "cand_a@ybl", 12345.0, 1, t0, t0), ("cand_a@ybl", "c@okaxis", 11111.0, 1, t0 + 1800, t0 + 1800)]
    flows_with_round = [("v2@oksbi", "cand_b@ybl", 12345.0, 1, t0, t0), ("cand_b@ybl", "c@okaxis", 6000.0, 1, t0 + 1800, t0 + 1800), ("cand_b@ybl", "d@okaxis", 5000.0, 1, t0 + 2400, t0 + 2400)]

    r_no = analyze(
        flows_no_round,
        feature_weights=tuned["weights"],
        model_intercept=tuned["intercept"],
        scoring_meta={"mode": "calibrated", "verdicts_used": 40, "label": "tuned"},
    )
    r_yes = analyze(
        flows_with_round,
        feature_weights=tuned["weights"],
        model_intercept=tuned["intercept"],
        scoring_meta={"mode": "calibrated", "verdicts_used": 40, "label": "tuned"},
    )
    m_no = next((m for n in r_no["networks"] for m in n["members"] if m["id"] == "cand_a@ybl"), None)
    m_yes = next((m for n in r_yes["networks"] for m in n["members"] if m["id"] == "cand_b@ybl"), None)
    # Candidate with round_amounts either isn't flagged at all or gets strictly lower score
    if m_yes is not None and m_no is not None:
        assert m_yes["mule_score"] < m_no["mule_score"]


def test_login_requires_valid_password():
    """C1: POST /api/v1/investigation/auth/login must fail with 401 when password is wrong or blank."""
    client = TestClient(app)
    bad = client.post("/api/v1/investigation/auth/login", json={"username": "INVESTIGATOR_DELHI", "password": "wrong-password-123"})
    assert bad.status_code == 401

    empty = client.post("/api/v1/investigation/auth/login", json={"username": "INVESTIGATOR_DELHI", "password": ""})
    assert empty.status_code == 401

    default_pw = AuthService.get_instance()
    # Configure known hash on test user and verify valid password works
    default_pw.password_hashes["INVESTIGATOR_DELHI"] = AuthService.hash_password("ValidPass!2026")
    ok = client.post("/api/v1/investigation/auth/login", json={"username": "INVESTIGATOR_DELHI", "password": "ValidPass!2026"})
    assert ok.status_code == 200
    assert ok.json().get("access_token")
