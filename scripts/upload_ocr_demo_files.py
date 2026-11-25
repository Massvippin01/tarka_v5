"""Upload demo_evidence_files/ocr/* to a case through the real ingestion API. Usage: python upload_ocr_demo_files.py [base_url] [case_id]"""
import sys
import time
from pathlib import Path

import httpx

base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8071"
case = sys.argv[2] if len(sys.argv) > 2 else "CASE-2026-886A726C"
folder = Path(__file__).resolve().parents[1] / "demo_evidence_files" / "ocr"
c = httpx.Client(base_url=base, timeout=120)
tok = c.post("/api/v1/forensics/auth/session", json={"username": "SUPERVISOR_NCR"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}
for name in ("upi_receipt_genuine.png", "upi_receipt_tampered.png", "bank_statement_page.pdf"):
    data = (folder / name).read_bytes()
    job = c.post("/api/v1/ingestion/jobs/create", headers=H, json={"case_id": case, "filename": name, "total_size_bytes": len(data)}).json()
    jid = job.get("job_id") or sys.exit(f"create failed: {job}")
    c.put(f"/api/v1/ingestion/jobs/{jid}/chunk", params={"offset": 0}, headers=H, content=data).raise_for_status()
    for _ in range(120):
        st = c.get(f"/api/v1/ingestion/jobs/{jid}/status", headers=H).json()
        if st["stage"] in ("EVIDENCE_AVAILABLE", "REJECTED", "NEEDS_MAPPING", "DUPLICATE") or st.get("error_message"):
            break
        time.sleep(1)
    print(name, jid, st["stage"], st.get("error_message"))
