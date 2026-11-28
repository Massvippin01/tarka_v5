"""Empirical Benchmark Suite for TARKA Evidence Admission & Ingestion Pipeline.

Measures:
1. SHA-256 Chunked Streaming Hashing (1MB, 10MB, 50MB)
2. Magic Byte Signature & MIME Verification (PDF, PNG, JPEG, ZIP, CSV)
3. Zip Archive Decompression Ratio & Bomb Detection
4. High-Throughput Financial Record CSV Normalization & Ingestion
"""

import hashlib
import io
import os
import time
import zipfile
import json
from pathlib import Path

def benchmark_sha256_streaming():
    sizes = [1, 10, 50] # MB
    results = {}
    for mb in sizes:
        data = os.urandom(mb * 1024 * 1024)
        t0 = time.perf_counter()
        hasher = hashlib.sha256()
        chunk_size = 64 * 1024 # 64 KB
        bio = io.BytesIO(data)
        while chunk := bio.read(chunk_size):
            hasher.update(chunk)
        digest = hasher.hexdigest()
        t1 = time.perf_counter()
        elapsed = t1 - t0
        throughput = mb / elapsed
        results[f"{mb}MB"] = {
            "elapsed_ms": round(elapsed * 1000, 2),
            "throughput_mb_s": round(throughput, 2),
            "sha256_prefix": digest[:16],
        }
    return results

def benchmark_signature_validation():
    signatures = {
        "pdf": b"%PDF-1.7\r\n...",
        "png": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...",
        "jpeg": b"\xff\xd8\xff\xe0\x00\x10JFIF...",
        "zip": b"PK\x03\x04\x14\x00\x00\x00...",
        "csv": b"timestamp,utr,sender,recipient,amount\n2026-11-28,...",
    }
    iterations = 100_000
    t0 = time.perf_counter()
    for _ in range(iterations):
        for ext, header in signatures.items():
            if ext == "pdf":
                ok = header.startswith(b"%PDF")
            elif ext == "png":
                ok = header.startswith(b"\x89PNG")
            elif ext == "jpeg":
                ok = header.startswith(b"\xff\xd8\xff")
            elif ext == "zip":
                ok = header.startswith(b"PK\x03\x04")
            else:
                ok = True
    t1 = time.perf_counter()
    total_checks = iterations * len(signatures)
    elapsed = t1 - t0
    return {
        "total_checks": total_checks,
        "elapsed_ms": round(elapsed * 1000, 2),
        "ops_per_second": round(total_checks / elapsed),
    }

def benchmark_archive_quarantine():
    # Construct synthetic zip with high compression ratio
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add 10MB of repeating zeros that compress to a few kilobytes
        zf.writestr("zero.bin", b"\x00" * (10 * 1024 * 1024))
    zip_bytes = bio.getvalue()
    
    t0 = time.perf_counter()
    compressed_len = len(zip_bytes)
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        total_uncompressed = sum(info.file_size for info in zf.infolist())
        ratio = total_uncompressed / max(1, compressed_len)
        is_bomb = ratio > 100.0 or total_uncompressed > 1024 * 1024 * 1024
    t1 = time.perf_counter()
    elapsed = t1 - t0
    
    return {
        "compressed_bytes": compressed_len,
        "uncompressed_bytes": total_uncompressed,
        "compression_ratio": round(ratio, 2),
        "is_bomb_flagged": is_bomb,
        "audit_latency_ms": round(elapsed * 1000, 3),
    }

def benchmark_transaction_normalization():
    # Generate 5,000 synthetic banking CSV rows
    lines = ["TransactionDate,UTRNumber,RemitterUPI,BeneficiaryUPI,AmountINR"]
    for i in range(5000):
        lines.append(f"2026-11-28 12:{i%60:02d}:00,UTR2026{i:06d},mule_{i%10}@upi,victim@upi,{1000 + i}.50")
    raw_csv = "\n".join(lines)
    
    t0 = time.perf_counter()
    parsed_records = []
    seen_utrs = set()
    for row in raw_csv.splitlines()[1:]:
        parts = row.split(",")
        if len(parts) >= 5:
            utr = parts[1].strip()
            if utr not in seen_utrs:
                seen_utrs.add(utr)
                parsed_records.append({
                    "date": parts[0],
                    "utr": utr,
                    "remitter": parts[2],
                    "beneficiary": parts[3],
                    "amount": float(parts[4]),
                })
    t1 = time.perf_counter()
    elapsed = t1 - t0
    
    return {
        "rows_processed": len(lines) - 1,
        "unique_records": len(parsed_records),
        "elapsed_ms": round(elapsed * 1000, 2),
        "throughput_rows_per_sec": round((len(lines) - 1) / elapsed),
    }

if __name__ == "__main__":
    print("Running TARKA Python Ingestion Benchmarks...")
    report = {
        "sha256_streaming": benchmark_sha256_streaming(),
        "signature_validation": benchmark_signature_validation(),
        "archive_quarantine": benchmark_archive_quarantine(),
        "transaction_normalization": benchmark_transaction_normalization(),
    }
    print(json.dumps(report, indent=2))
    with open("scripts/benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print("Results saved to scripts/benchmark_results.json")
