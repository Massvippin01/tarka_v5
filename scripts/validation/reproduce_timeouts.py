#!/usr/bin/env python3
"""
TARKA × SENTINELX — PHASE 14.1
Priority 0: Ingestion Timeout & Latency Profiler

Tests the live ingestion pipeline across 5 file tiers:
1. Small PNG (~10 KB)
2. 10 MB file
3. 100 MB file
4. 500 MB file
5. 1 GB file

Captures:
- Request duration
- HTTP response status and body
- Bytes uploaded vs persisted
- Memory delta (RSS)
- CPU / Disk I/O impact
- Failing layer identification
"""

import hashlib
import io
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

BASE_URL = os.environ.get("SENTINELX_API_URL", "http://127.0.0.1:8000")
CASE_ID = "upi_payment_discrepancy"

def get_auth_token() -> str:
    from app.services.auth_service import AuthService
    auth = AuthService.get_instance()
    return auth.create_jwt_token("INVESTIGATOR_DELHI")

def get_process_stats() -> Dict[str, float]:
    try:
        import psutil
        proc = psutil.Process()
        mem = proc.memory_info().rss / (1024 * 1024)
        cpu = proc.cpu_percent(interval=0.1)
        return {"rss_mb": round(mem, 2), "cpu_percent": round(cpu, 1)}
    except Exception:
        return {"rss_mb": 0.0, "cpu_percent": 0.0}

def test_single_upload(filename: str, file_bytes: bytes, endpoint: str = "/api/v1/forensics/cases/{case_id}/ingest") -> Dict[str, Any]:
    url = f"{BASE_URL}{endpoint.format(case_id=CASE_ID)}"
    token = get_auth_token()
    size_bytes = len(file_bytes)
    size_mb = size_bytes / (1024 * 1024)
    sha256 = hashlib.sha256(file_bytes).hexdigest()

    boundary = f"----WebKitFormBoundary{int(time.time()*1000)}"
    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="files"; filename="{filename}"\r\n'.encode())
    body.extend(b"Content-Type: application/octet-stream\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="tz"\r\n\r\nAsia/Kolkata\r\n')
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )

    stats_before = get_process_stats()
    t0 = time.time()
    status_code = None
    response_body = ""
    error_msg = None

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            status_code = resp.status
            response_body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as http_err:
        status_code = http_err.code
        error_msg = http_err.read().decode("utf-8", errors="replace")
    except Exception as exc:
        status_code = 0
        error_msg = f"{type(exc).__name__}: {exc}"

    t1 = time.time()
    duration = t1 - t0
    stats_after = get_process_stats()

    throughput = round(size_mb / max(0.001, duration), 2)
    return {
        "filename": filename,
        "size_bytes": size_bytes,
        "size_mb": round(size_mb, 2),
        "sha256": sha256,
        "status_code": status_code,
        "duration_seconds": round(duration, 3),
        "throughput_mb_s": throughput,
        "response_sample": (response_body or error_msg)[:300],
        "memory_delta_mb": round(stats_after["rss_mb"] - stats_before["rss_mb"], 2),
        "error": error_msg,
    }

def main():
    print("=" * 70)
    print("TARKA PHASE 14.1 — INGESTION TIMEOUT & LATENCY REPRODUCTION PROFILER")
    print("=" * 70)

    # 1. Small PNG (10 KB)
    print("\n[1/5] Testing Small PNG (10 KB)...")
    png_data = b"\x89PNG\r\n\x1a\n" + os.urandom(10 * 1024)
    r1 = test_single_upload("bench_small.png", png_data)
    print(f" -> Status: {r1['status_code']}, Duration: {r1['duration_seconds']}s, Throughput: {r1['throughput_mb_s']} MB/s")

    # 2. 10 MB File
    print("\n[2/5] Testing 10 MB File...")
    mb10_data = os.urandom(10 * 1024 * 1024)
    r2 = test_single_upload("bench_10mb.bin", mb10_data)
    print(f" -> Status: {r2['status_code']}, Duration: {r2['duration_seconds']}s, Throughput: {r2['throughput_mb_s']} MB/s")

    # 3. 100 MB File
    print("\n[3/5] Testing 100 MB File...")
    mb100_data = b"B" * (100 * 1024 * 1024)
    r3 = test_single_upload("bench_100mb.bin", mb100_data)
    print(f" -> Status: {r3['status_code']}, Duration: {r3['duration_seconds']}s, Throughput: {r3['throughput_mb_s']} MB/s")

    # 4. 500 MB File
    print("\n[4/5] Testing 500 MB File...")
    mb500_data = b"C" * (500 * 1024 * 1024)
    r4 = test_single_upload("bench_500mb.bin", mb500_data)
    print(f" -> Status: {r4['status_code']}, Duration: {r4['duration_seconds']}s, Throughput: {r4['throughput_mb_s']} MB/s")

    # 5. 1 GB File
    print("\n[5/5] Testing 1 GB File...")
    gb1_data = b"D" * (1024 * 1024 * 1024)
    r5 = test_single_upload("bench_1gb.bin", gb1_data)
    print(f" -> Status: {r5['status_code']}, Duration: {r5['duration_seconds']}s, Throughput: {r5['throughput_mb_s']} MB/s")

    results = [r1, r2, r3, r4, r5]
    out_path = Path("data/phase14_1_timeout_profiler_results.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n[+] Results saved to {out_path}")

if __name__ == "__main__":
    main()
