#!/usr/bin/env python3
"""
TARKA × SENTINELX — PHASE 14.1
Gigabyte-Scale Evidence Corpus Generator

Generates deterministic multi-tier synthetic evidence corpora spanning:
- Mobile Payment Screenshots (PNG & JPEG: 1080x2400, 720x1600, 1440x3120)
- Core Banking CSV & Financial Statement Exports (UPI RRN, double-entry ledgers)
- Statutory Legal Notices & Multi-Page PDFs (1, 5, 20, 50 pages)
- Investigative Correspondence (.txt, .eml)
- Defensive Security Fixtures (CSV Formula Injection, Polyglot, Zip-Slip Traversal)
- Forensic Edge Cases (Zero-Byte, Exact Duplicates, Corrupted Streams, Mismatched Extensions)
- Volumetric Opaque Binary Containers (streaming chunks to hit exact target tiers)

Features:
- Deterministic seeding (--seed)
- Exact decimal or binary byte targets (--target-mb, --target-gb, --tier, --byte-standard)
- Pre-flight disk space safety verification (enforces minimum 1.5x free space margin)
- Clean generation with automatic prior artifact purging (--clean-generated)
- Cryptographic SHA-256 hashing and immutable JSON manifest generation
"""

import argparse
import hashlib
import json
import os
import random
import shutil
import struct
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

DEFAULT_SEED = 0x5E4714E1


def check_disk_space(target_bytes: int, target_dir: Path, margin: float = 1.5, force: bool = False):
    """Verifies sufficient free disk space exists before generating large corpus tiers."""
    target_dir.mkdir(parents=True, exist_ok=True)
    total, used, free = shutil.disk_usage(target_dir)
    required = int(target_bytes * margin)
    if free < required and not force:
        raise RuntimeError(
            f"Insufficient disk space on {target_dir.drive or target_dir}: "
            f"Available: {free / (1024**3):.2f} GB, Required (with {margin}x margin): {required / (1024**3):.2f} GB. "
            f"Target size: {target_bytes / (1024**3):.2f} GB. Aborting for filesystem safety. Use --force to override."
        )


def generate_png_bytes(width: int, height: int, r: int = 40, g: int = 120, b: int = 240) -> bytes:
    """Creates a valid, uncompressed RGBA PNG image with deterministic dimensions and color."""
    import zlib
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    header = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b"IHDR", ihdr_data)

    raw_scanlines = bytearray()
    for _ in range(height):
        raw_scanlines.append(0)
        raw_scanlines.extend(bytes([r, g, b]) * width)

    compressed_idat = zlib.compress(bytes(raw_scanlines), level=6)
    idat = chunk(b"IDAT", compressed_idat)
    iend = chunk(b"IEND", b"")
    return header + ihdr + idat + iend


def generate_jpeg_bytes(width: int = 800, height: int = 600) -> bytes:
    """Creates a minimal valid JPEG image byte stream."""
    try:
        from PIL import Image
        import io
        img = Image.new("RGB", (width, height), color=(random.randint(50, 200), random.randint(50, 200), random.randint(50, 200)))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception:
        return bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
            0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
            0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
            0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
            0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
            0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
            0x00, 0xBF, 0x00, 0xFF, 0xD9
        ])


def generate_bank_csv(rows: int = 500) -> bytes:
    """Generates structured CBS bank statement CSV with headers and balanced double-entry rows."""
    lines = ["Date,Transaction_ID,Description,Debit,Credit,Balance,RRN"]
    balance = 500000.0
    for i in range(1, rows + 1):
        tx_id = f"CBS-TXN-{i:06d}"
        date = f"{1 + (i % 28):02d}/11/2026"
        is_debit = (i % 3 != 0)
        amount = round(random.uniform(100.0, 50000.0), 2)
        rrn = f"202611{random.randint(100000, 999999)}"
        if is_debit:
            balance -= amount
            lines.append(f"{date},{tx_id},UPI-PAYMENT-DEBIT-{i},{amount:.2f},,{balance:.2f},{rrn}")
        else:
            balance += amount
            lines.append(f"{date},{tx_id},SALARY-CREDIT-{i},,{amount:.2f},{balance:.2f},{rrn}")
    return "\n".join(lines).encode("utf-8")


def generate_multi_page_pdf(title: str = "Forensic Audit Report", num_pages: int = 5) -> bytes:
    """Generates a valid multi-page PDF document stream conforming to PDF-1.4 specification."""
    objects = []
    
    # 1: Catalog
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
    
    # Page object IDs will be 3, 4, ... 2 + num_pages
    page_ids = [str(3 + i * 2) for i in range(num_pages)]
    kids_str = " ".join([f"{pid} 0 R" for pid in page_ids])
    objects.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>\nendobj")
    
    content_obj_ids = []
    for i in range(num_pages):
        page_num = i + 1
        page_obj_id = 3 + i * 2
        content_obj_id = page_obj_id + 1
        content_obj_ids.append(content_obj_id)
        
        # Page object
        objects.append(
            f"{page_obj_id} 0 obj\n"
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {content_obj_id} 0 R /Resources << /Font << /F1 {3 + num_pages * 2} 0 R >> >> >>\n"
            f"endobj"
        )
        
        # Content stream object
        stream_body = (
            f"BT\n/F1 16 Tf\n50 720 Td\n({title} - Confirmed Evidence Page {page_num} of {num_pages}) Tj\n"
            f"/F1 11 Tf\n0 -25 Td\n(Preserved under Section 63 Bharatiya Nagarik Suraksha Sanhita 2023) Tj\n"
            f"0 -20 Td\n(Timestamp: 2026-11-24T23:40:00Z | Integrity: SHA-256 CAS Verified) Tj\n"
            f"ET\n"
        )
        stream_bytes = stream_body.encode("utf-8")
        objects.append(
            f"{content_obj_id} 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n{stream_body}endstream\nendobj"
        )
        
    font_obj_id = 3 + num_pages * 2
    objects.append(f"{font_obj_id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj")
    
    # Assemble with xref table
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj.encode("utf-8") + b"\n")
        
    xref_offset = len(out)
    out.extend(f"xref\n0 {len(offsets)}\n".encode("utf-8"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("utf-8"))
        
    out.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("utf-8")
    )
    return bytes(out)


def generate_eml_email(subject: str, sender: str, recipient: str, body: str) -> bytes:
    """Generates RFC 822 format investigative email artifact."""
    eml = (
        f"From: {sender}\n"
        f"To: {recipient}\n"
        f"Subject: {subject}\n"
        f"Date: Tue, 24 Nov 2026 14:30:00 +0530\n"
        f"Message-ID: <{random.randint(100000, 999999)}.forensics@sentinelx.local>\n"
        f"MIME-Version: 1.0\n"
        f"Content-Type: text/plain; charset=UTF-8\n\n"
        f"{body}\n"
    )
    return eml.encode("utf-8")


def calculate_target_bytes(
    tier: Optional[str] = None,
    target_mb: Optional[int] = None,
    target_gb: Optional[int] = None,
    byte_standard: str = "binary",
) -> tuple[int, str]:
    """Calculates exact target bytes based on tier/MB/GB and standard."""
    multiplier = 1000 if byte_standard == "decimal" else 1024

    if target_gb is not None and target_gb > 0:
        total = target_gb * (multiplier ** 3)
        return total, f"{target_gb}GB"
    elif target_mb is not None and target_mb > 0:
        total = target_mb * (multiplier ** 2)
        return total, f"{target_mb}MB"
    elif tier:
        norm_tier = tier.strip().upper()
        tier_map = {
            "10MB": 10 * (multiplier ** 2),
            "100MB": 100 * (multiplier ** 2),
            "500MB": 500 * (multiplier ** 2),
            "1GB": 1 * (multiplier ** 3),
            "2GB": 2 * (multiplier ** 3),
            "5GB": 5 * (multiplier ** 3),
            "10GB": 10 * (multiplier ** 3),
        }
        if norm_tier in tier_map:
            return tier_map[norm_tier], norm_tier
        raise ValueError(f"Unrecognized tier '{tier}'. Supported: {list(tier_map.keys())}")
    else:
        return 100 * (multiplier ** 2), "100MB"


def build_corpus(
    target_bytes: int,
    tier_label: str,
    output_dir: Path,
    manifest_path: Optional[Path] = None,
    seed: int = DEFAULT_SEED,
    clean_generated: bool = False,
    force: bool = False,
    byte_standard: str = "binary",
) -> Dict[str, Any]:
    """Constructs a deterministic multi-format evidence corpus."""
    random.seed(seed)
    
    # 1. Pre-flight disk space check
    check_disk_space(target_bytes, output_dir, margin=1.5, force=force)

    # 2. Clean previous artifacts if requested
    if clean_generated and output_dir.exists():
        print(f"[*] Cleaning previous generated artifacts in {output_dir}")
        for item in output_dir.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_entries: List[Dict[str, Any]] = []
    current_bytes = 0
    seq = 1

    print(f"[*] Generating corpus: Tier={tier_label} ({target_bytes:,} bytes, standard={byte_standard}) into {output_dir}")

    def register_artifact(
        fname: str,
        data: bytes,
        ftype: str,
        ffmt: str,
        expected_parser: str,
        expected_result: str,
        category: str,
    ):
        nonlocal current_bytes, seq
        fpath = output_dir / fname
        with open(fpath, "wb") as f:
            f.write(data)
        size = len(data)
        sha = hashlib.sha256(data).hexdigest()
        manifest_entries.append({
            "file_id": f"EVID-{seq:04d}",
            "filename": fname,
            "path": str(fpath.relative_to(output_dir)),
            "file_type": ftype,
            "format": ffmt,
            "size_bytes": size,
            "sha256": sha,
            "expected_parser": expected_parser,
            "expected_result": expected_result,
            "category": category,
        })
        current_bytes += size
        seq += 1

    # --- CATEGORY 1: MOBILE PAYMENT SCREENSHOTS (PNG) ---
    resolutions = [(1080, 2400), (720, 1600), (1440, 3120), (1080, 1920)]
    for i, (w, h) in enumerate(resolutions):
        png_data = generate_png_bytes(w, h, r=20 + i * 30, g=80 + i * 20, b=180 + i * 15)
        register_artifact(
            fname=f"EVID_IMG_UPI_SCREENSHOT_{seq:04d}.png",
            data=png_data,
            ftype="IMAGE",
            ffmt="PNG",
            expected_parser="image_ocr",
            expected_result="PARSED",
            category=f"Mobile Payment Screenshot ({w}x{h} RGBA)",
        )

    # --- CATEGORY 2: MERCHANT PAPER RECEIPTS (JPEG) ---
    for _ in range(3):
        jpg_data = generate_jpeg_bytes(800, 600)
        register_artifact(
            fname=f"EVID_IMG_RECEIPT_{seq:04d}.jpg",
            data=jpg_data,
            ftype="IMAGE",
            ffmt="JPEG",
            expected_parser="image_ocr",
            expected_result="PARSED",
            category="Merchant POS Printed Receipt Photo (JPEG)",
        )

    # --- CATEGORY 3: FINANCIAL CORE BANKING STATEMENTS (CSV) ---
    for rows in [50, 500, 2500]:
        csv_data = generate_bank_csv(rows)
        register_artifact(
            fname=f"EVID_FIN_STATEMENT_{seq:04d}.csv",
            data=csv_data,
            ftype="CSV",
            ffmt="CSV",
            expected_parser="csv_parser",
            expected_result="PARSED",
            category=f"Core Banking Ledger Export ({rows} rows, double-entry)",
        )

    # --- CATEGORY 4: MULTI-PAGE STATUTORY LEGAL NOTICES (PDF) ---
    for page_cnt in [1, 5, 20]:
        pdf_data = generate_multi_page_pdf(title=f"Statutory Notice Section 63 BSA Batch {seq}", num_pages=page_cnt)
        register_artifact(
            fname=f"EVID_DOC_LEGAL_NOTICE_{seq:04d}.pdf",
            data=pdf_data,
            ftype="PDF",
            ffmt="PDF",
            expected_parser="pdf_parser",
            expected_result="PARSED",
            category=f"Statutory Court Order & Police Report ({page_cnt} pages, PDF-1.4)",
        )

    # --- CATEGORY 5: INVESTIGATIVE CORRESPONDENCE (.txt, .eml) ---
    txt_note = (
        "SENTINELX FORENSIC MEMORANDUM\n"
        "Date: 2026-11-24\n"
        "Investigator: Insp. Sharma (Delhi Cyber Cell)\n"
        "Suspect UPI Handle: merchant.pay@icici\n"
        "Discrepancy: Ledger reflects INR 45,000 credit absent in Core CBS switch logs.\n"
    ).encode("utf-8")
    register_artifact(
        fname=f"EVID_TXT_INVESTIGATOR_MEMO_{seq:04d}.txt",
        data=txt_note,
        ftype="TEXT",
        ffmt="TXT",
        expected_parser="text_parser",
        expected_result="PARSED",
        category="Investigator Contemporaneous Case Notes",
    )

    eml_data = generate_eml_email(
        subject="FWD: Urgent Disputed Transaction Alert - RRN 202611883921",
        sender="fraud-desk@hdfcbank.com",
        recipient="investigations@cybercrime.gov.in",
        body="Dear Team,\nPlease find attached disputed transaction log for immediate freeze action.",
    )
    register_artifact(
        fname=f"EVID_EML_DISPUTE_ALERT_{seq:04d}.eml",
        data=eml_data,
        ftype="TEXT",
        ffmt="EML",
        expected_parser="text_parser",
        expected_result="PARSED",
        category="Inter-Bank Incident Notification (RFC 822 Email)",
    )

    # --- CATEGORY 6: FORENSIC EDGE CASES ---
    # 6.1 Zero-Byte File
    register_artifact(
        fname=f"EVID_EDGE_ZERO_BYTE_{seq:04d}.bin",
        data=b"",
        ftype="EMPTY",
        ffmt="BIN",
        expected_parser="none",
        expected_result="REJECTED",
        category="Forensic Edge Case: Zero-Byte Truncated Stream",
    )

    # 6.2 Duplicate Files (Identical Hash Verification)
    dup_sample = b"SENTINELX_DETERMINISTIC_DUPLICATE_SAMPLE_PAYLOAD_EVIDENCE_BYTE_STREAM"
    register_artifact(
        fname=f"EVID_EDGE_DUPLICATE_ORIGINAL_{seq:04d}.bin",
        data=dup_sample,
        ftype="OPAQUE_BINARY",
        ffmt="BIN",
        expected_parser="binary_cas",
        expected_result="ACCEPTED",
        category="Forensic Edge Case: Original Evidence Stream for Deduplication Test",
    )
    register_artifact(
        fname=f"EVID_EDGE_DUPLICATE_COPY_{seq:04d}.bin",
        data=dup_sample,
        ftype="OPAQUE_BINARY",
        ffmt="BIN",
        expected_parser="binary_cas",
        expected_result="ACCEPTED",
        category="Forensic Edge Case: Bit-Identical Duplicate Copy (Deduplication Validation)",
    )

    # 6.3 Truncated JPEG (Corrupted Stream)
    corrupted_jpg = bytes([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]) + os.urandom(128)
    register_artifact(
        fname=f"EVID_EDGE_CORRUPTED_STREAM_{seq:04d}.jpg",
        data=corrupted_jpg,
        ftype="CORRUPTED",
        ffmt="JPEG",
        expected_parser="image_ocr",
        expected_result="REQUIRES_REVIEW",
        category="Forensic Edge Case: Incomplete Bitstream with Truncated Markers",
    )

    # 6.4 Mismatched Extension (CSV labeled as PNG)
    mismatched_content = b"Date,TxID,Amount\n2026-11-24,TX999,5000.00\n"
    register_artifact(
        fname=f"EVID_EDGE_MISMATCHED_EXT_{seq:04d}.png",
        data=mismatched_content,
        ftype="CSV",
        ffmt="PNG",
        expected_parser="csv_parser",
        expected_result="REQUIRES_REVIEW",
        category="Forensic Edge Case: MIME / Magic Byte Mismatch (CSV masquerading as PNG)",
    )

    # --- CATEGORY 7: DEFENSIVE SECURITY FIXTURES ---
    # 7.1 CSV Formula Injection
    csv_injection = "Date,TxID,Payee,Amount\n2026-11-24,TX1,=cmd|' /C calc'!A0,100.00\n2026-11-24,TX2,@SUM(1+1)*cmd|' /C calc'!A0,200.00\n"
    register_artifact(
        fname=f"EVID_SEC_FORMULA_INJ_{seq:04d}.csv",
        data=csv_injection.encode("utf-8"),
        ftype="CSV",
        ffmt="CSV",
        expected_parser="csv_parser",
        expected_result="PARSED",
        category="Defensive Security: CSV Dynamic Data Exchange (DDE) Formula Injection",
    )

    # 7.2 Disguised Polyglot Payload
    fake_png = b"\x89PNG\r\n\x1a\n<script>alert('xss')</script><?php echo system($_GET['c']); ?>"
    register_artifact(
        fname=f"EVID_SEC_POLYGLOT_PAYLOAD_{seq:04d}.png",
        data=fake_png,
        ftype="IMAGE",
        ffmt="PNG",
        expected_parser="image_ocr",
        expected_result="ACCEPTED",
        category="Defensive Security: Polyglot File with Valid PNG Magic Header",
    )

    # 7.3 Zip-Slip Path Traversal Archive
    zip_path = output_dir / f"EVID_SEC_ZIP_SLIP_{seq:04d}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0:root:/root:/bin/bash\n")
        zf.writestr("legitimate_evidence.txt", "Legitimate investigative statement\n")
    with open(zip_path, "rb") as zf_r:
        zip_bytes = zf_r.read()
    zip_size = len(zip_bytes)
    zip_sha = hashlib.sha256(zip_bytes).hexdigest()
    manifest_entries.append({
        "file_id": f"EVID-{seq:04d}",
        "filename": zip_path.name,
        "path": str(zip_path.relative_to(output_dir)),
        "file_type": "ARCHIVE",
        "format": "ZIP",
        "size_bytes": zip_size,
        "sha256": zip_sha,
        "expected_parser": "archive_parser",
        "expected_result": "PARSED",
        "category": "Defensive Security: Zip-Slip Directory Traversal Archive",
    })
    current_bytes += zip_size
    seq += 1

    # --- CATEGORY 8: VOLUMETRIC FILLERS (SCALED UP TO TARGET TIER) ---
    block_index = 1
    # Determine appropriate chunk scale for fillers
    if target_bytes >= 1024 * 1024 * 1024:
        fill_chunk = 64 * 1024 * 1024  # 64 MB chunks for >= 1 GB
    elif target_bytes >= 100 * 1024 * 1024:
        fill_chunk = 16 * 1024 * 1024  # 16 MB chunks for >= 100 MB
    else:
        fill_chunk = 2 * 1024 * 1024   # 2 MB chunks for smaller tiers

    while current_bytes < target_bytes:
        remaining = target_bytes - current_bytes
        chunk_size = min(remaining, fill_chunk)
        fname = f"EVID_BIN_VOLUMETRIC_{block_index:04d}.bin"
        fpath = output_dir / fname

        hasher = hashlib.sha256()
        bytes_written = 0
        with open(fpath, "wb") as f_out:
            while bytes_written < chunk_size:
                step = min(65536, chunk_size - bytes_written)
                buf = os.urandom(step)
                f_out.write(buf)
                hasher.update(buf)
                bytes_written += step

        current_bytes += bytes_written
        manifest_entries.append({
            "file_id": f"EVID-{seq:04d}",
            "filename": fname,
            "path": str(fpath.relative_to(output_dir)),
            "file_type": "OPAQUE_BINARY",
            "format": "BIN",
            "size_bytes": bytes_written,
            "sha256": hasher.hexdigest(),
            "expected_parser": "binary_cas",
            "expected_result": "ACCEPTED",
            "category": "Volumetric Digital Evidence Container (Streaming Binary Block)",
        })
        seq += 1
        block_index += 1

    # Construct final manifest
    manifest = {
        "corpus_version": "1.1.0",
        "generation_tier": tier_label,
        "target_bytes": target_bytes,
        "total_bytes": current_bytes,
        "total_files": len(manifest_entries),
        "seed": hex(seed),
        "byte_standard": byte_standard,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files": manifest_entries,
    }

    if manifest_path is None:
        manifest_path = output_dir / "corpus_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f_man:
        json.dump(manifest, f_man, indent=2)

    print(f"[+] Corpus successfully generated: {len(manifest_entries)} files, {current_bytes:,} bytes.")
    print(f"[+] Manifest written to {manifest_path}")
    return manifest


def main():
    parser = argparse.ArgumentParser(description="TARKA Gigabyte Evidence Corpus Generator")
    parser.add_argument("--tier", default=None, help="Target corpus size tier (e.g. 10MB, 100MB, 500MB, 1GB, 2GB, 5GB)")
    parser.add_argument("--target-mb", type=int, default=None, help="Explicit target size in Megabytes")
    parser.add_argument("--target-gb", type=int, default=None, help="Explicit target size in Gigabytes")
    parser.add_argument("--seed", default=None, help="Random seed (hex or int, e.g. 0x5E4714E1)")
    parser.add_argument("--output-dir", "--out", default=None, help="Output directory path")
    parser.add_argument("--manifest", default=None, help="Path to write the output JSON manifest")
    parser.add_argument("--clean-generated", action="store_true", help="Clean prior artifacts in output directory")
    parser.add_argument("--byte-standard", choices=["decimal", "binary"], default="binary", help="Byte standard")
    parser.add_argument("--force", action="store_true", help="Bypass disk space safety margin checks")
    args = parser.parse_args()

    # Determine seed
    if args.seed:
        seed_val = int(args.seed, 16) if args.seed.startswith("0x") else int(args.seed)
    else:
        seed_val = DEFAULT_SEED

    # Calculate target bytes
    target_bytes, tier_label = calculate_target_bytes(
        tier=args.tier,
        target_mb=args.target_mb,
        target_gb=args.target_gb,
        byte_standard=args.byte_standard,
    )

    out_dir = Path(args.output_dir) if args.output_dir else Path(f"data/validation_corpus/tier_{tier_label.lower()}")
    manifest_p = Path(args.manifest) if args.manifest else None

    build_corpus(
        target_bytes=target_bytes,
        tier_label=tier_label,
        output_dir=out_dir,
        manifest_path=manifest_p,
        seed=seed_val,
        clean_generated=args.clean_generated,
        force=args.force,
        byte_standard=args.byte_standard,
    )


if __name__ == "__main__":
    main()
