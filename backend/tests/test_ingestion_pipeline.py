"""Phase 1B: persisted jobs, real streaming parse, identifiers, quarantine, derived graph."""

import asyncio
import hashlib
import tracemalloc

import pytest

from app.api.case import derived_graph
from app.services.ingestion import derived_store
from app.services.ingestion.derived_store import DerivedStore, extract_identifiers
from app.services.ingestion.large_evidence_engine import IngestionJobManager, IngestionStage

CASE = "CASE-TEST-1B"
CSV = (
    "txn_date,txn_time,payer,payee,amount,rrn\n"
    "22/09/2026,09:14:22,victim@oksbi,mule.one@ybl,\"2,85,000.00\",626509188410\n"
    "22/09/2026,09:18:04,victim@oksbi,mule.one@ybl,215000,626510149921\n"
    "22/09/2026,09:20:00,mule.one@ybl,9876543210,300000,626510149922\n"
    "not-a-date,10:00:00,x,y,10,BAD1\n"
    "22/09/2026,09:25:00,SBIN0004821 610514882109,ATM CASH,120000,626510149923\n"
).encode()


def _run_upload(mgr, payload: bytes, filename="stmt.csv", case_id=CASE):
    async def go():
        job = mgr.create_job(case_id=case_id, filename=filename, total_size_bytes=len(payload))
        await mgr.append_chunk(job.job_id, 0, payload)  # small file: pipeline runs inline
        return job

    return asyncio.run(go())


@pytest.fixture
def mgr(tmp_path, monkeypatch):
    m = IngestionJobManager(base_dir=tmp_path)
    monkeypatch.setattr(IngestionJobManager, "_instance", m)
    return m


def test_identifiers_phone_not_double_counted():
    found = set(extract_identifiers("call +91-9876543210 or pay mule.one@ybl, a/c 610514882109 IFSC SBIN0004821"))
    assert ("phone", "9876543210") in found
    assert ("vpa", "mule.one@ybl") in found
    assert ("account", "610514882109") in found
    assert ("ifsc", "SBIN0004821") in found
    assert ("account", "9876543210") not in found


def test_bank_csv_end_to_end(mgr):
    job = _run_upload(mgr, CSV)
    assert job.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, job.error_message
    s = job.analytics_summary
    assert (s["rows_read"], s["rows_accepted"], s["rows_rejected"]) == (5, 4, 1)
    assert s["total_amount_inr"] == 920000.0
    assert s["row_accounting"] == "ALL_ROWS_ACCOUNTED"
    assert s["identifiers_by_kind"]["vpa"] == 2 and s["identifiers_by_kind"]["phone"] == 1
    assert s["sha256"] == hashlib.sha256(CSV).hexdigest()

    store = DerivedStore(mgr.derived_dir / CASE)
    bad = store.rejected_rows(job.job_id)
    assert len(bad) == 1 and bad[0]["line"] == 5 and "datetime" in bad[0]["reason"]

    nodes, edges = derived_graph(CASE)
    flows = {(e["sourceLabel"], e["targetLabel"]): (e["amount"], e["txnCount"]) for e in edges}
    assert flows[("victim@oksbi", "mule.one@ybl")] == (500000.0, 2)  # two debits aggregated
    assert len(nodes) == 5


def test_line_numbers_survive_batching(mgr, monkeypatch):
    monkeypatch.setattr(derived_store, "BATCH_ROWS", 2)
    job = _run_upload(mgr, CSV)
    assert job.analytics_summary["rows_accepted"] == 4
    assert DerivedStore(mgr.derived_dir / CASE).rejected_rows(job.job_id)[0]["line"] == 5


def test_unrecognised_columns_need_mapping(mgr):
    job = _run_upload(mgr, b"foo,bar\n1,2\n")
    assert job.stage == IngestionStage.NEEDS_MAPPING
    assert job.analytics_summary["detected_headers"] == ["foo", "bar"]


def test_upload_resumes_after_restart(tmp_path):
    first = IngestionJobManager(base_dir=tmp_path)
    half = len(CSV) // 2

    async def part1():
        job = first.create_job(case_id=CASE, filename="stmt.csv", total_size_bytes=len(CSV))
        await first.append_chunk(job.job_id, 0, CSV[:half])
        return job.job_id

    job_id = asyncio.run(part1())

    restarted = IngestionJobManager(base_dir=tmp_path)  # simulates a backend restart
    job = restarted.jobs[job_id]
    assert job.bytes_uploaded == half and job.stage == IngestionStage.STAGE_1_FILE_RECEIVED

    asyncio.run(restarted.append_chunk(job_id, half, CSV[half:]))
    assert job.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, job.error_message
    assert job.sha256_digest == hashlib.sha256(CSV).hexdigest()  # hash rebuilt from the staging file


def test_interrupted_processing_can_be_resumed(tmp_path):
    first = IngestionJobManager(base_dir=tmp_path)
    job = _run_upload(first, CSV)
    job.stage = IngestionStage.STAGE_6_CONTENT_EXTRACTED  # pretend the server died mid-parse
    first._save(job)

    restarted = IngestionJobManager(base_dir=tmp_path)
    reloaded = restarted.jobs[job.job_id]
    assert "interrupted" in reloaded.error_message

    async def resume():
        restarted.resume_job(job.job_id)
        await asyncio.gather(*restarted._tasks)

    asyncio.run(resume())
    assert reloaded.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, reloaded.error_message
    assert reloaded.analytics_summary["rows_accepted"] == 4  # re-run replaced rows, no duplicates
    edges = DerivedStore(restarted.derived_dir / CASE).graph()["edges"]
    assert len(edges) == 3  # 4 rows → 3 payer→payee flows (the two victim debits aggregate)


def test_large_file_bounded_memory(tmp_path):
    rows = 120_000
    path = tmp_path / "big.csv"
    with open(path, "w", encoding="utf-8") as f:
        f.write("txn_date,txn_time,payer,payee,amount,rrn\n")
        for i in range(rows):
            f.write(f"22/09/2026,09:{i % 60:02d}:00,acct{i % 997}@ybl,acct{(i * 7) % 991}@okaxis,{1000 + i},{600000000000 + i}\n")
    store = DerivedStore(tmp_path / "derived")
    tracemalloc.start()
    summary = store.ingest_bank_csv("JOB-BIG", path)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert summary["rows_accepted"] == rows and summary["rows_rejected"] == 0
    file_mb = path.stat().st_size / 1e6
    # Peak is set by one batch, not the file: must stay well under what loading all rows would take.
    assert peak / 1e6 < 50, f"peak {peak / 1e6:.0f} MB for a {file_mb:.0f} MB file"


def test_fast_date_path_matches_full_parser():
    """epoch_of (cached date + hand-parsed time) must equal the full parser, and reject bad times."""
    from app.services.ingestion.derived_store import _DateParser

    fast, slow = _DateParser(), _DateParser()
    for d, t in [("22/09/2026", "09:14:22"), ("22/09/2026", "23:59"), ("2026-09-22", "00:00:01"),
                 ("22-Sep-2026", "10:00:00"), ("2026-11-14T10:00:00", ""), ("22/09/2026", "9:5:7")]:
        assert fast.epoch_of(d, t) == slow.epoch(f"{d} {t}".strip()), (d, t)
    with pytest.raises(ValueError):
        fast.epoch_of("22/09/2026", "25:00:00")


def test_ingest_rebuilds_indexes_and_accepts_plain_amounts(tmp_path):
    import sqlite3

    path = tmp_path / "s.csv"
    path.write_text("txn_date,txn_time,payer,payee,amount\n22/09/2026,09:00:00,a@ybl,b@ybl,\"1,00,000.50\"\n"
                    "22/09/2026,09:01:00,a@ybl,b@ybl,Rs. 250\n22/09/2026,09:02:00,a@ybl,b@ybl,inf\n", encoding="utf-8")
    store = DerivedStore(tmp_path / "d")
    s = store.ingest_bank_csv("J", path)
    assert s["total_amount_inr"] == 100250.5  # "inf" is not a number: falls back to the cleaner, which finds none
    names = {r[0] for r in sqlite3.connect(store.path).execute("SELECT name FROM sqlite_master WHERE type='index'")}
    assert {"txns_ts", "txns_job"} <= names


def test_processing_progress_is_reported(mgr):
    """The job exposes live processing (step, rows, pct, ETA) and ends DONE with the networks cache warm."""
    seen = []
    orig = DerivedStore._load_bank_csv

    def spy(self, job_id, path, columns=None, progress=None):
        def tap(rows, done):
            progress(rows, done)
            seen.append(dict(mgr.jobs[job_id].processing))
        return orig(self, job_id, path, columns, tap)

    import app.services.ingestion.derived_store as ds
    old_batch, ds.BATCH_ROWS = ds.BATCH_ROWS, 2
    DerivedStore._load_bank_csv = spy
    try:
        job = _run_upload(mgr, CSV)
    finally:
        DerivedStore._load_bank_csv = orig
        ds.BATCH_ROWS = old_batch
    assert job.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, job.error_message
    assert seen and all(p["step"] == "READING_ROWS" for p in seen)
    assert seen[-1]["rows"] >= 4 and 0 < seen[-1]["pct"] <= 99
    assert job.to_dict()["processing"]["step"] == "DONE" and job.to_dict()["processing"]["pct"] == 100.0


def test_overlapping_statements_count_each_transaction_once(tmp_path):
    """Jan–Mar then Feb–Apr exports share rows: the shared ones are stored once and reported."""
    head = "txn_date,txn_time,payer,payee,amount,rrn\n"
    a = tmp_path / "jan_mar.csv"
    b = tmp_path / "feb_apr.csv"
    a.write_text(head + "10/01/2026,10:00:00,v@ybl,m@ybl,100,R1\n15/02/2026,10:00:00,v@ybl,m@ybl,200,R2\n", encoding="utf-8")
    b.write_text(head + "15/02/2026,10:00:00,v@ybl,m@ybl,200,R2\n20/04/2026,10:00:00,v@ybl,m@ybl,300,R3\n", encoding="utf-8")
    store = DerivedStore(tmp_path / "d")
    store.ingest_bank_csv("A", a)
    s = store.ingest_bank_csv("B", b)
    assert s["rows_already_in_case"] == 1 and s["total_amount_inr"] == 300
    import sqlite3
    assert sqlite3.connect(store.path).execute("SELECT SUM(amount), COUNT(*) FROM txns").fetchone() == (600.0, 3)
    assert store.ingest_bank_csv("B", b)["rows_already_in_case"] == 1  # re-running a job stays correct
