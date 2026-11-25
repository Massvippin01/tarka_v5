"""Phase 1B: duplicates, column mapping + templates, networks/mule scoring, projects, split."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import IngestionJobManager, IngestionStage
from app.services.ingestion.networks import analyze

CASE = "CASE-2026-001"  # demo supervisor can access the fixture cases
CASE2 = "CASE-2026-002"

# victim → mule.one → mule.two → ATM; second victim also pays mule.one. Separate small network below.
GANG_CSV = (
    "txn_date,txn_time,payer,payee,amount,rrn\n"
    "22/09/2026,09:00:00,victim1@oksbi,mule.one@ybl,500000,1\n"
    "22/09/2026,09:30:00,victim2@okaxis,mule.one@ybl,200000,2\n"
    "22/09/2026,10:00:00,mule.one@ybl,mule.two@ibl,650000,3\n"
    "22/09/2026,11:00:00,mule.two@ibl,ATM CASH WITHDRAWAL,600000,4\n"
    "23/09/2026,08:00:00,shop@okhdfc,supplier 9876543210,1000,5\n"
).encode()


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(IngestionJobManager, "_instance", IngestionJobManager(base_dir=tmp_path))
    token = AuthService.get_instance().create_jwt_token("SUPERVISOR_NCR")
    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {token}"
    return c


def upload(client, payload: bytes, case_id=CASE, filename="stmt.csv") -> dict:
    job = client.post("/api/v1/ingestion/jobs/create",
                      json={"case_id": case_id, "filename": filename, "total_size_bytes": len(payload)}).json()
    r = client.put(f"/api/v1/ingestion/jobs/{job['job_id']}/chunk?offset=0", content=payload)
    assert r.status_code == 200, r.text
    return client.get(f"/api/v1/ingestion/jobs/{job['job_id']}/status").json()


def test_analyze_roles_hops_and_components():
    flows = [
        ("victim1@oksbi", "mule.one@ybl", 500000, 1, 0, 0),
        ("victim2@okaxis", "mule.one@ybl", 200000, 1, 1800, 1800),
        ("mule.one@ybl", "mule.two@ibl", 650000, 1, 3600, 3600),
        ("mule.two@ibl", "ATM CASH WITHDRAWAL", 600000, 1, 7200, 7200),
        ("Mule.One@YBL ", "mule.two@ibl", 0, 1, 3700, 3700),  # same party, different spacing/case → auto-merged
        ("shop@okhdfc", "supplier 9876543210", 1000, 1, 0, 0),
        ("9876543210@paytm", "x@ybl", 10, 1, 0, 0),
        ("REFUND mule.one@ybl", "y@ybl", 10, 1, 0, 0),  # different party sharing a mule's VPA
    ]
    out = analyze(flows, {"CASE-OTHER": {("vpa", "mule.two@ibl")}})
    gang = out["networks"][0]
    roles = {m["label"]: (m["role"], m["hop"]) for m in gang["members"]}
    assert roles["victim1@oksbi"] == ("VICTIM", 0)
    assert roles["mule.one@ybl"] == ("MULE", 1)
    assert roles["mule.two@ibl"][0] == "MULE" and roles["mule.two@ibl"][1] == 2
    assert roles["ATM CASH WITHDRAWAL"] == ("CASH_OUT", 3)
    assert (gang["member_count"], gang["mule_count"], gang["victim_count"], gang["amount_inr"]) == (5, 2, 2, 700000)
    ids = {m["id"] for m in gang["members"]}
    assert len(gang["links"]) == 4 and all(a in ids and b in ids and amt > 0 for a, b, amt in gang["links"])
    # Networks grow only around suspected mules; ordinary shop/P2P flows are counted, not listed.
    assert len(out["networks"]) == 1 and out["parties_outside_networks"] == 6
    # probable match with a network member goes to review, not merged; outsiders' look-alikes are ignored
    assert [r["why"] for r in out["review_queue"]] == ["both contain the same vpa mule.one@ybl"]
    assert out["cross_case_hits"] == [{"identifier": "mule.two@ibl", "kind": "vpa", "case_ids": ["CASE-OTHER"]}]


def test_duplicate_points_at_original(client):
    first = upload(client, GANG_CSV)
    assert first["stage"] == "EVIDENCE_AVAILABLE"
    again = upload(client, GANG_CSV, case_id=CASE2, filename="copy.csv")
    assert again["stage"] == "DUPLICATE"
    assert again["analytics_summary"]["duplicate_of"] == {"job_id": first["job_id"], "case_id": CASE, "filename": "stmt.csv"}


def test_column_mapping_and_template(client):
    odd = b"Value Dt,Narration,Withdrawal Amt\n22/09/2026,UPI/mule.one@ybl,5000\n23/09/2026,UPI/x@ybl,bad\n"
    job = upload(client, odd)
    assert job["stage"] == "NEEDS_MAPPING"
    assert job["analytics_summary"]["sample_rows"][0] == ["22/09/2026", "UPI/mule.one@ybl", "5000"]

    bad = client.post(f"/api/v1/ingestion/jobs/{job['job_id']}/mapping", json={"columns": {"date": "Value Dt"}})
    assert bad.status_code == 409 and "amount" in bad.json()["detail"]

    r = client.post(f"/api/v1/ingestion/jobs/{job['job_id']}/mapping", json={
        "columns": {"date": "Value Dt", "amount": "Withdrawal Amt", "payee": "Narration"},
        "template_name": "HDFC savings",
    })
    assert r.status_code == 200, r.text
    assert r.json()["stage"] == "EVIDENCE_AVAILABLE"
    assert r.json()["analytics_summary"]["rows_accepted"] == 2

    assert client.get("/api/v1/ingestion/mapping-templates").json()[0]["name"] == "HDFC savings"
    # Same headers next time → template applied automatically
    again = upload(client, odd.replace(b"5000", b"6000"), filename="next.csv")
    assert again["stage"] == "EVIDENCE_AVAILABLE"
    assert again["analytics_summary"]["column_mapping"] == "HDFC savings"


def test_projects_lifecycle_jobs_and_split(client):
    upload(client, GANG_CSV)
    p = client.post("/api/v1/projects", json={"name": "Operation Chakra"}).json()
    assert client.post(f"/api/v1/projects/{p['project_id']}/cases", json={"case_id": CASE}).status_code == 200
    r = client.patch(f"/api/v1/projects/cases/{CASE}", json={"lifecycle": "INVESTIGATING", "assignee": "SI Rao"})
    assert r.json() == {"case_id": CASE, "project_id": p["project_id"], "lifecycle": "INVESTIGATING", "assignee": "SI Rao"}
    assert client.patch(f"/api/v1/projects/cases/{CASE}", json={"lifecycle": "DONE"}).status_code == 422
    assert client.patch(f"/api/v1/projects/{p['project_id']}", json={"archived": True}).json()["archived"] is True

    jobs = client.get(f"/api/v1/ingestion/jobs?project_id={p['project_id']}").json()
    assert len(jobs) == 1 and jobs[0]["case_id"] == CASE
    assert client.get(f"/api/v1/ingestion/jobs?case_id={CASE2}").json() == []

    nets = client.get(f"/api/v1/cases/{CASE}/networks").json()["networks"]
    gang = nets[0]
    assert gang["mule_count"] == 2 and gang["amount_inr"] == 700000
    split = client.post(f"/api/v1/cases/{CASE}/networks/{gang['network_id']}/split", json={"new_case_id": CASE2}).json()
    assert split == {"case_id": CASE2, "rows_copied": 4, "project_id": p["project_id"]}
    new_nets = client.get(f"/api/v1/cases/{CASE2}/networks").json()
    assert len(new_nets["networks"]) == 1 and new_nets["networks"][0]["member_count"] == 5
    # Both cases now share the gang's identifiers
    assert any(CASE in h["case_ids"] for h in new_nets["cross_case_hits"])
    meta = {c["case_id"]: c for c in client.get("/api/v1/projects").json()[0]["cases"]}
    assert meta[CASE2]["lifecycle"] == "INVESTIGATING"


def test_column_map_survives_restart(tmp_path):
    mgr = IngestionJobManager(base_dir=tmp_path)
    odd = b"Value Dt,Withdrawal Amt\n22/09/2026,5000\n"

    async def go():
        job = mgr.create_job(case_id=CASE, filename="a.csv", total_size_bytes=len(odd))
        await mgr.append_chunk(job.job_id, 0, odd)
        await mgr.apply_mapping(job.job_id, {"date": "Value Dt", "amount": "Withdrawal Amt"})
        return job.job_id

    job_id = asyncio.run(go())
    assert IngestionJobManager(base_dir=tmp_path).jobs[job_id].column_map == {"date": "Value Dt", "amount": "Withdrawal Amt"}


def test_planted_gangs_found(tmp_path):
    """1D regression: small planted-gang dataset with salary/ATM look-alikes (backend/tools/validate_mule_scoring.py)."""
    import importlib.util
    from pathlib import Path

    spec = importlib.util.spec_from_file_location(
        "validate_mule_scoring", Path(__file__).resolve().parents[1] / "tools" / "validate_mule_scoring.py")
    tool = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tool)
    r = tool.main(["--rows", "20000", "--gangs", "6", "--out", str(tmp_path)])
    assert r["precision"] >= 0.9 and r["recall"] >= 0.9, r
    assert r["gangs_in_own_network"] == "6/6", r


def test_new_case_end_to_end(client):
    """Create a case → creator can upload → bundle + networks come from the upload, money reconciles."""
    other = client.post("/api/v1/projects/cases", json={"title": "Loan app fraud, Sector 62"}).json()
    case_id = other["case_id"]
    assert other["owner_id"] and other["lifecycle"] == "INTAKE"
    job = upload(client, GANG_CSV, case_id=case_id, filename="gang.csv")
    assert job["stage"] == "EVIDENCE_AVAILABLE"

    b = client.get(f"/api/v1/cases/{case_id}/bundle").json()
    assert b["dataSource"] == "UPLOADED" and b["title"] == "Loan app fraud, Sector 62"
    assert b["bookedLossInr"] == 700000  # victims → mules only, not every hop
    assert b["cashedOutInr"] == 600000
    assert b["cashedOutInr"] + b["recoverableLibrInr"] + b["unaccountedInr"] == b["bookedLossInr"]
    assert len(b["fileManifest"]) == 1 and b["fileManifest"][0]["recordCount"] == 5

    listed = {c["case_id"]: c for c in client.get("/api/v1/projects/cases").json()}
    assert listed[case_id]["lifecycle"] == "INVESTIGATING"  # advanced when the upload finished


def test_unknown_case_still_forbidden(client):
    assert client.get("/api/v1/cases/CASE-2026-NOPE99/bundle").status_code == 403
    other_user = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
    mine = client.post("/api/v1/projects/cases", json={"title": "x"}).json()["case_id"]
    r = client.get(f"/api/v1/cases/{mine}/bundle", headers={"Authorization": f"Bearer {other_user}"})
    assert r.status_code == 403  # only the creator gets access


def test_explanations_use_indian_grouping():
    from app.services.ingestion.networks import inr
    assert [inr(x) for x in (999, 139450, 12393000)] == ["₹999", "₹1,39,450", "₹1,23,93,000"]


SECOND_GANG_CSV = (
    "txn_date,txn_time,payer,payee,amount,rrn\n"
    "24/09/2026,10:00:00,victim3@ybl,mule.three@paytm,300000,11\n"
    "24/09/2026,10:40:00,mule.three@paytm,mule.four@okaxis,290000,12\n"
    "24/09/2026,12:00:00,mule.four@okaxis,WAZIRX CRYPTO,280000,13\n"
).encode()


def test_bulk_intake_proposes_and_creates_cases(client):
    """Files first: holding case → proposals (attach to the matching case / new case) → officer confirms once."""
    existing = client.post("/api/v1/projects/cases", json={"title": "Earlier FIR"}).json()["case_id"]
    upload(client, b"txn_date,txn_time,payer,payee,amount\n20/09/2026,10:00:00,someone@okaxis,mule.two@ibl,5000\n",
           case_id=existing, filename="earlier.csv")

    intake = client.post("/api/v1/projects/intake", json={"name": "Raid files"}).json()
    holding = intake["case_id"]
    assert upload(client, GANG_CSV, case_id=holding, filename="a.csv")["stage"] == "EVIDENCE_AVAILABLE"
    assert upload(client, SECOND_GANG_CSV, case_id=holding, filename="b.csv")["stage"] == "EVIDENCE_AVAILABLE"

    nets = client.get(f"/api/v1/cases/{holding}/networks").json()["networks"]
    by_action = {n["proposal"]["action"]: n for n in nets}
    assert set(by_action) == {"ATTACH", "NEW_CASE"}
    assert by_action["ATTACH"]["proposal"]["attach_case_id"] == existing
    assert "mule.two@ibl" in by_action["ATTACH"]["proposal"]["shared_identifiers"]

    ids = [n["network_id"] for n in nets]
    r = client.post(f"/api/v1/cases/{holding}/networks/create-cases",
                    json={"network_ids": ids, "titles": {by_action["NEW_CASE"]["network_id"]: "Crypto cash-out gang"}}).json()
    assert r["failed"] == [] and len(r["created"]) == 1 and len(r["attached"]) == 1
    new_case = r["created"][0]["case_id"]
    assert r["created"][0]["title"] == "Crypto cash-out gang" and r["created"][0]["rows_copied"] == 3
    assert r["attached"][0] == {"network_id": by_action["ATTACH"]["network_id"], "case_id": existing, "rows_copied": 4}

    # The new case belongs to the intake project, is open to its creator, and has its own gang.
    project = next(p for p in client.get("/api/v1/projects").json() if p["project_id"] == intake["project_id"])
    assert {c["case_id"] for c in project["cases"]} >= {holding, new_case}
    assert client.get(f"/api/v1/cases/{new_case}/networks").json()["networks"][0]["mule_count"] == 2

    # Asking again never makes a second case.
    again = client.post(f"/api/v1/cases/{holding}/networks/create-cases", json={"network_ids": ids}).json()
    assert again["created"] == [] and len(again["failed"]) == 2


def test_split_without_id_opens_a_fresh_case(client):
    upload(client, GANG_CSV)
    net = client.get(f"/api/v1/cases/{CASE}/networks").json()["networks"][0]
    r = client.post(f"/api/v1/cases/{CASE}/networks/{net['network_id']}/split", json={"title": "Gang 1"})
    assert r.status_code == 200, r.text
    assert r.json()["case_id"].startswith("CASE-") and r.json()["rows_copied"] == 4


def _as(user_key: str) -> dict:
    return {"Authorization": f"Bearer {AuthService.get_instance().create_jwt_token(user_key)}"}


def test_new_case_keeps_what_the_officer_typed(client):
    r = client.post("/api/v1/projects/cases", json={"title": "Loan app fraud", "details": {
        "fir_number": "FIR 412/2026", "police_station": "Sector 62 PS", "complainant_name": "Sunita R",
        "claimed_loss_inr": 250000}}).json()
    listed = {c["case_id"]: c for c in client.get("/api/v1/projects/cases").json()}[r["case_id"]]
    assert listed["details"]["fir_number"] == "FIR 412/2026" and listed["details"]["claimed_loss_inr"] == 250000
    b = client.get(f"/api/v1/cases/{r['case_id']}/bundle").json()
    assert (b["firNumber"], b["policeStation"], b["complainantName"], b["claimedLossInr"]) == \
        ("FIR 412/2026", "Sector 62 PS", "Sunita R", 250000)


def test_only_creator_or_case_member_edits_a_project(client):
    p = client.post("/api/v1/projects", json={"name": "Supervisor's op"}).json()
    other = _as("INVESTIGATOR_DELHI")
    assert client.patch(f"/api/v1/projects/{p['project_id']}", json={"archived": True}, headers=other).status_code == 403
    assert client.post(f"/api/v1/projects/{p['project_id']}/cases", json={"case_id": CASE2}, headers=other).status_code == 403
    assert client.patch(f"/api/v1/projects/{p['project_id']}", json={"name": "Renamed"}).json()["name"] == "Renamed"


def test_duplicate_hides_a_case_you_cannot_open(client):
    mine = client.post("/api/v1/projects/cases", json={"title": "Supervisor only"}).json()["case_id"]
    upload(client, GANG_CSV, case_id=mine, filename="secret.csv")
    other = _as("INVESTIGATOR_DELHI")
    job = client.post("/api/v1/ingestion/jobs/create", headers=other,
                      json={"case_id": CASE2, "filename": "copy.csv", "total_size_bytes": len(GANG_CSV)}).json()
    r = client.put(f"/api/v1/ingestion/jobs/{job['job_id']}/chunk?offset=0", content=GANG_CSV, headers=other).json()
    assert r["stage"] == "DUPLICATE"
    assert r["analytics_summary"]["duplicate_of"] == {"job_id": None, "case_id": None, "filename": None, "hidden": True}
    assert mine not in str(client.get(f"/api/v1/ingestion/jobs/{job['job_id']}/status", headers=other).json())


def test_adding_a_gang_twice_never_double_counts(client):
    """The same statement in two holding cases, both 'added to existing case': the money is counted once."""
    existing = client.post("/api/v1/projects/cases", json={"title": "Original FIR"}).json()["case_id"]
    upload(client, GANG_CSV, case_id=existing, filename="orig.csv")
    loss = client.get(f"/api/v1/cases/{existing}/bundle").json()["bookedLossInr"]
    for i in range(2):
        holding = client.post("/api/v1/projects/intake", json={"name": f"Batch {i}"}).json()["case_id"]
        copy = GANG_CSV + f"25/09/2026,10:00:00,other{i}@ybl,shop@okhdfc,10,X{i}\n".encode()  # not a byte duplicate
        upload(client, copy, case_id=holding, filename=f"copy{i}.csv")
        nets = client.get(f"/api/v1/cases/{holding}/networks").json()["networks"]
        gang = next(n for n in nets if n["proposal"]["action"] == "ATTACH")
        r = client.post(f"/api/v1/cases/{holding}/networks/create-cases", json={"network_ids": [gang["network_id"]]}).json()
        assert r["attached"][0]["case_id"] == existing and r["attached"][0]["rows_copied"] == 0
    assert client.get(f"/api/v1/cases/{existing}/bundle").json()["bookedLossInr"] == loss


def test_filed_gang_is_not_proposed_into_its_own_new_case(client):
    holding = client.post("/api/v1/projects/intake", json={"name": "Once"}).json()["case_id"]
    upload(client, SECOND_GANG_CSV, case_id=holding, filename="g.csv")
    net = client.get(f"/api/v1/cases/{holding}/networks").json()["networks"][0]
    client.post(f"/api/v1/cases/{holding}/networks/create-cases", json={"network_ids": [net["network_id"]]})
    after = client.get(f"/api/v1/cases/{holding}/networks").json()["networks"][0]
    assert after["proposal"]["action"] == "NEW_CASE" and after["triage"]["status"] == "CASE_OPENED"


def test_exports_for_other_tools(client):
    import csv as _csv, io as _io, json as _json
    upload(client, GANG_CSV)
    i2 = list(_csv.reader(_io.StringIO(client.get(f"/api/v1/cases/{CASE}/export?format=i2").text)))
    assert i2[0][0] == "From" and any(r[0] == "victim1@oksbi" and r[3] == "MULE" for r in i2[1:])
    sus = list(_csv.DictReader(_io.StringIO(client.get(f"/api/v1/cases/{CASE}/export?format=suspects").text)))
    assert {r["Identifier"] for r in sus} == {"mule.one@ybl", "mule.two@ibl"}
    assert {r["Layer (hops from victim)"] for r in sus} == {"1", "2"}  # beyond layer 1, unlike the Registry today
    stix = _json.loads(client.get(f"/api/v1/cases/{CASE}/export?format=stix").text)
    patterns = {o["pattern"] for o in stix["objects"] if o["type"] == "indicator"}
    assert "[user-account:user_id = 'mule.two@ibl']" in patterns and stix["type"] == "bundle"
    assert client.get(f"/api/v1/cases/{CASE}/export?format=xml").status_code == 422


def test_only_intake_holding_cases_carry_proposals(client):
    upload(client, GANG_CSV)  # an ordinary case
    assert all("proposal" not in n for n in client.get(f"/api/v1/cases/{CASE}/networks").json()["networks"])


def test_new_case_form_starts_golden_clock_without_inventing_loss(client):
    """The complaint time starts the clock; booked loss stays unknown until statements are uploaded."""
    import time
    pid = client.post("/api/v1/projects", json={"name": "Op Mule Hunt"}).json()["project_id"]
    at = time.time() - 120 * 60
    r = client.post("/api/v1/projects/cases", json={"title": "FIR 12", "project_id": pid,
                    "details": {"fir_number": "12/2026", "claimed_loss_inr": 50000, "complaint_received_at": at}})
    assert r.status_code == 200 and r.json()["project_id"] == pid
    assert "booked_loss_inr" not in r.json()["details"]
    gh = client.get(f"/api/v1/cases/{r.json()['case_id']}/bundle").json().get("goldenHour") or {}
    assert gh.get("active") and abs(gh["started_at"] - at) < 1
    assert client.post("/api/v1/projects/cases", json={"title": "x", "project_id": "nope"}).status_code == 404
