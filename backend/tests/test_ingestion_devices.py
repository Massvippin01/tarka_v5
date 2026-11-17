"""Device / login logs: header detection, streaming parse into device_events, shared-identifier clusters, SIM changes."""

import asyncio

import pytest

from app.services.ingestion.device_store import case_devices, looks_like_device_log, map_device_columns
from app.services.ingestion.large_evidence_engine import IngestionJobManager, IngestionStage

CASE = "CASE-TEST-DEV"
LOG = (
    "timestamp,account,msisdn,imei,imsi,client_ip,wifi_bssid,event\n"
    "22/09/2026 09:00:00,Mule.One@ybl,+91 9876500001,35-209900-176148-1,404450000000001,49.36.1.10,AA:BB:CC:00:00:01,LOGIN\n"
    "22/09/2026 09:05:00,mule.two@ybl,9876500002,352099001761481,404450000000002,49.36.1.11,,LOGIN\n"  # same IMEI as one
    "22/09/2026 09:06:00,mule.three@ybl,9876500003,861234000000009,404450000000003,49.36.1.11,,LOGIN\n"  # same IP as two
    "22/09/2026 09:07:00,lonely@ybl,9876500004,861234000000017,404450000000004,10.0.0.9,,LOGIN\n"
    "22/09/2026 11:00:00,mule.one@ybl,9876500001,352099001761481,404459999999999,49.36.1.10,,LOGIN\n"  # new SIM
    "22/09/2026 08:30:00,mule.three@ybl,9876500003,,404450000000003,,,SIM SWAP REQUEST\n"
    "not-a-date,mule.two@ybl,,352099001761481,,,,LOGIN\n"
    "22/09/2026 09:10:00,,,352099001761481,,,,LOGIN\n"
)


def _run_upload(mgr, payload: bytes, filename="login_log.csv"):
    async def go():
        job = mgr.create_job(case_id=CASE, filename=filename, total_size_bytes=len(payload))
        await mgr.append_chunk(job.job_id, 0, payload)
        return job

    return asyncio.run(go())


@pytest.fixture
def mgr(tmp_path, monkeypatch):
    m = IngestionJobManager(base_dir=tmp_path)
    monkeypatch.setattr(IngestionJobManager, "_instance", m)
    return m


def test_header_detection():
    assert looks_like_device_log(["Start Time", "A Party", "IMEI", "IMSI", "Cell ID"])  # CDR
    assert looks_like_device_log(["login_time", "user_id", "ip_address", "user_agent"])  # bank login log
    assert not looks_like_device_log(["txn_date", "payer", "payee", "amount", "client_ip"])  # bank statement
    assert not looks_like_device_log(["timestamp", "account", "remarks"])  # no device identifier
    cols = map_device_columns(["event_type", "device_id", "client_ip", "event_time"])
    assert cols == {"event": 0, "device_id": 1, "ip": 2, "time": 3}


def test_device_log_end_to_end(mgr):
    job = _run_upload(mgr, LOG.encode())
    assert job.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, job.error_message
    s = job.analytics_summary
    assert s["parser"] == "device_log"
    assert (s["rows_read"], s["rows_accepted"], s["rows_rejected"]) == (8, 6, 2)
    assert s["row_accounting"] == "ALL_ROWS_ACCOUNTED"

    d = case_devices(mgr.derived_dir / CASE)
    assert d["has_device_data"] and d["events_total"] == 6 and d["accounts_total"] == 4
    # one, two share an IMEI (spaced/dashed IMEI normalised); two, three share an IP → one cluster of three
    assert len(d["clusters"]) == 1
    c = d["clusters"][0]
    assert c["accounts"] == ["mule.one@ybl", "mule.three@ybl", "mule.two@ybl"]
    assert c["strongest_kind"] == "imei"
    assert {(l["kind"], l["value"]) for l in c["links"]} == {("imei", "352099001761481"), ("ip", "49.36.1.11")}

    kinds = sorted((x["account"], x["kind"]) for x in d["sim_changes"])
    assert kinds == [("mule.one@ybl", "new_sim"), ("mule.three@ybl", "logged")]

    rows = case_devices(mgr.derived_dir / CASE, kind="imei", value="352099001761481")["rows"]
    assert [r["acct"] for r in rows] == ["mule.one@ybl", "mule.two@ybl", "mule.one@ybl"]
    assert all(r["line"] > 1 for r in rows)


def test_common_identifier_is_not_a_cluster(mgr, monkeypatch):
    from app.services.ingestion import device_store

    monkeypatch.setattr(device_store, "COMMON_LIMIT", 2)
    _run_upload(mgr, LOG.encode())
    d = case_devices(mgr.derived_dir / CASE)
    # the IMEI is on 2 accounts (≤ limit) and stays evidence; nothing over the limit here
    assert d["clusters"] and not d["common_identifiers"]
    monkeypatch.setattr(device_store, "COMMON_LIMIT", 1)
    d = case_devices(mgr.derived_dir / CASE)
    assert not d["clusters"] and {c["kind"] for c in d["common_identifiers"]} == {"imei", "ip"}


def test_no_device_data(tmp_path):
    assert case_devices(tmp_path / "nothing")["has_device_data"] is False
