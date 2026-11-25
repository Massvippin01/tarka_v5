"""
TARKA Phase 14.2: Founder Evidence Ingestion Verification.
Streams and validates the four founder-supplied evidence files through the live running application:
1. 1000270701.jpg (Google Pay UPI Payment Screenshot, ~50KB)
2. 1000270698.jpg (Physical handwritten bill photo from Moto G64 5G, ~1.32MB)
3. 1000270702.png (Scanned document of handwritten bill, ~4.75MB)
4. 1000270703.png (Designed side-by-side comparison infographic, ~4.72MB)
"""

import sys
import os
import io
import time
import json
import hashlib
import threading
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath("backend"))

from app.services.auth_service import AuthService

BASE_URL = "http://127.0.0.1:8000"
CASE_ID = "upi_payment_discrepancy"

FOUNDER_FILES = [
    {
        "filename": "1000270701.jpg",
        "path": Path("data/cases/upi_payment_discrepancy/evidence/raw/ART-20261124161403-D586D8E7/1000270701.jpg"),
        "expected_role": "Mobile UPI Payment Screenshot (Google Pay ₹1,495)"
    },
    {
        "filename": "1000270698.jpg",
        "path": Path("data/cases/upi_payment_discrepancy/evidence/raw/ART-20261124161403-46AF2983/1000270698.jpg"),
        "expected_role": "Handwritten Bill Photo (Moto G64 5G camera, Sambandam Cycles)"
    },
    {
        "filename": "1000270702.png",
        "path": Path("data/cases/upi_payment_discrepancy/evidence/raw/ART-20261124161403-6592F125/1000270702.png"),
        "expected_role": "Handwritten Bill High-Res Scan (Sambandam Cycles Mandaveli)"
    },
    {
        "filename": "1000270703.png",
        "path": Path("data/cases/upi_payment_discrepancy/evidence/raw/ART-20261124161403-359E2C3B/1000270703.png"),
        "expected_role": "Designed Comparison Infographic (Screenshot vs Statement)"
    }
]


def run_founder_ingestion_verification():
    print("=" * 70)
    print("TARKA PHASE 14.2: FOUNDER-LED REAL EVIDENCE INGESTION")
    print("=" * 70)

    auth = AuthService.get_instance()
    token = auth.create_jwt_token("INVESTIGATOR_DELHI")
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "TARKA-Phase14.2-Validator/1.0"
    }

    # 1. Verify / ensure case
    req = urllib.request.Request(f"{BASE_URL}/api/v1/forensics/cases/{CASE_ID}", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            case_data = json.loads(resp.read().decode())
            print(f"[+] Case verified: '{CASE_ID}' (Title: {case_data.get('title')})")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            # Create case
            create_payload = json.dumps({
                "case_id": CASE_ID,
                "title": "UPI Payment Discrepancy & Account Skimming",
                "description": "Founder-provided live multimodal payment discrepancy evidence.",
                "jurisdiction": "IN_DELHI"
            }).encode()
            c_req = urllib.request.Request(
                f"{BASE_URL}/api/v1/forensics/cases",
                data=create_payload,
                headers={**headers, "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(c_req) as c_resp:
                case_data = json.loads(c_resp.read().decode())
                print(f"[+] Case created: '{CASE_ID}'")
        else:
            raise

    # 2. Start background SSE listener
    sse_events: List[Dict[str, Any]] = []
    sse_stop = threading.Event()

    def listen_sse():
        sse_req = urllib.request.Request(
            f"{BASE_URL}/api/v1/forensics/cases/{CASE_ID}/events/stream?token={token}",
            headers={"Accept": "text/event-stream"}
        )
        try:
            with urllib.request.urlopen(sse_req) as sse_stream:
                buf = ""
                while not sse_stop.is_set():
                    line = sse_stream.readline().decode("utf-8", errors="replace")
                    if not line:
                        break
                    buf += line
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        try:
                            parsed = json.loads(data_str)
                            sse_events.append(parsed)
                        except Exception:
                            pass
        except Exception as exc:
            pass

    sse_thread = threading.Thread(target=listen_sse, daemon=True)
    sse_thread.start()
    time.sleep(0.5)

    ingestion_records = []

    # 3. Ingest each file through the API
    import mimetypes
    for item in FOUNDER_FILES:
        fname = item["filename"]
        fpath = item["path"]
        role = item["expected_role"]

        if not fpath.exists():
            print(f"[-] ERROR: Source file not found: {fpath}")
            continue

        raw_bytes = fpath.read_bytes()
        file_size = len(raw_bytes)
        computed_sha = hashlib.sha256(raw_bytes).hexdigest()
        detected_mime = "image/png" if fname.endswith(".png") else "image/jpeg"

        print(f"\n[*] Uploading {fname} ({file_size:,} bytes, {role})...")

        # Construct multipart boundary
        boundary = "----TARKAValidationBoundary" + hashlib.md5(fname.encode()).hexdigest()
        body = bytearray()
        # Form field 'source_channel'
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"source_channel\"\r\n\r\nFOUNDER_FIELD_SUBMISSION\r\n".encode())
        # File field 'file'
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{fname}\"\r\nContent-Type: {detected_mime}\r\n\r\n".encode())
        body.extend(raw_bytes)
        body.extend(f"\r\n--{boundary}--\r\n".encode())

        upload_req = urllib.request.Request(
            f"{BASE_URL}/api/v1/forensics/cases/{CASE_ID}/evidence/upload",
            data=bytes(body),
            headers={
                **headers,
                "Content-Type": f"multipart/form-data; boundary={boundary}"
            }
        )

        t0 = time.perf_counter()
        with urllib.request.urlopen(upload_req) as up_resp:
            duration = time.perf_counter() - t0
            res_json = json.loads(up_resp.read().decode())

        ev = res_json.get("evidence", {})
        job = res_json.get("analysis_job", {})
        aid = ev.get("evidence_id")
        job_id = job.get("job_id")

        print(f" [+] HTTP {up_resp.status} in {duration*1000:.1f}ms: EvidenceID={aid}, JobID={job_id}")

        # 4. Immediate CAS Read-Back & Bitstream Verification
        verify_req = urllib.request.Request(
            f"{BASE_URL}/api/v1/forensics/cases/{CASE_ID}/artifacts/{aid}/verify",
            headers=headers
        )
        with urllib.request.urlopen(verify_req) as v_resp:
            v_data = json.loads(v_resp.read().decode())

        is_cas_intact = v_data.get("bitstream_intact", False) or v_data.get("verified", False)
        cas_sha = v_data.get("stored_hash") or v_data.get("recorded_sha256")

        print(f" [+] CAS Bitstream Integrity: {'INTACT' if is_cas_intact else 'FAILED'} (Hash: {cas_sha[:16]}...)")

        record = {
            "filename": fname,
            "role": role,
            "evidence_id": aid,
            "file_size_bytes": file_size,
            "detected_mime": detected_mime,
            "client_sha256": computed_sha,
            "cas_sha256": cas_sha,
            "sha256_match": computed_sha == cas_sha,
            "bitstream_verified": is_cas_intact,
            "upload_duration_ms": round(duration * 1000, 2),
            "job_id": job_id,
            "initial_job_status": job.get("status"),
        }
        ingestion_records.append(record)

    # Allow background analysis and SSE events to settle
    time.sleep(3.0)
    sse_stop.set()

    # 5. Fetch custody chain head
    case_detail_req = urllib.request.Request(f"{BASE_URL}/api/v1/forensics/cases/{CASE_ID}", headers=headers)
    with urllib.request.urlopen(case_detail_req) as cd_resp:
        cd_data = json.loads(cd_resp.read().decode())

    total_artifacts = cd_data.get("artifact_count", len(ingestion_records))

    print("\n" + "=" * 70)
    print("INGESTION VERIFICATION SUMMARY")
    print("=" * 70)
    print(f"Total founder evidence files processed: {len(ingestion_records)}/4")
    print(f"Total artifacts registered in case: {total_artifacts}")
    print(f"Total live SSE events collected: {len(sse_events)}")

    all_matched = all(r["sha256_match"] and r["bitstream_verified"] for r in ingestion_records)
    print(f"Cryptographic CAS Verification: {'100% BITSTREAM MATCH' if all_matched else 'TAMPER DETECTED'}")

    results = {
        "case_id": CASE_ID,
        "verified_at_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "all_passed": all_matched and len(ingestion_records) == 4,
        "evidence_records": ingestion_records,
        "sse_events_count": len(sse_events),
        "total_case_artifacts": total_artifacts
    }

    out_file = Path("data/phase14_2_ingestion_results.json")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(results, indent=2))
    print(f"[+] Ingestion results written to {out_file}")

    return results

if __name__ == "__main__":
    run_founder_ingestion_verification()
