"""
TARKA-TXBENCH: Ground-Truth Dataset Generator
Generates realistic multimodal payment receipts and ground-truth manifests for scientific evaluation:
1. Genuine UPI receipts across PhonePe, Google Pay, Paytm, BHIM, Cred, Amazon Pay.
2. Tampered / manipulated receipts:
   - Scenario A: Digital Alteration (Amount edited, font mismatch, ELA high difference)
   - Scenario B: False UTR / Replay
   - Scenario C: Resampling and Crop Manipulation
   - Scenario D: Metadata Scrubbed / Editing Tool Watermarks
   - Scenario E: Copy-Move Timestamp Alteration
"""

import io
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, PngImagePlugin


DATASET_DIR = Path("data/txbench")
MANIFEST_PATH = DATASET_DIR / "manifest.json"


def generate_benchmark_dataset():
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    images_dir = DATASET_DIR / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "benchmark_name": "TARKA-TXBENCH",
        "version": "1.0.0",
        "description": "Standardized Indian UPI Multimodal Forensic Evaluation Benchmark",
        "scenarios_count": 10,
        "cases": [],
    }

    scenarios = [
        # Genuine Scenarios
        {
            "id": "TXB-GEN-01",
            "filename": "phonepe_genuine_25000.png",
            "app": "PhonePe",
            "ground_truth_label": "GENUINE",
            "amount": 25000.0,
            "currency": "INR",
            "utr": "412356789012",
            "timestamp": "2026-04-15T11:42:00Z",
            "tampered": False,
            "color_header": (90, 40, 160),
        },
        {
            "id": "TXB-GEN-02",
            "filename": "gpay_genuine_15000.png",
            "app": "Google Pay",
            "ground_truth_label": "GENUINE",
            "amount": 15000.0,
            "currency": "INR",
            "utr": "412356789013",
            "timestamp": "2026-04-15T12:05:00Z",
            "tampered": False,
            "color_header": (26, 115, 232),
        },
        {
            "id": "TXB-GEN-03",
            "filename": "paytm_genuine_5000.png",
            "app": "Paytm",
            "ground_truth_label": "GENUINE",
            "amount": 5000.0,
            "currency": "INR",
            "utr": "412356789014",
            "timestamp": "2026-04-15T13:30:00Z",
            "tampered": False,
            "color_header": (0, 185, 245),
        },
        {
            "id": "TXB-GEN-04",
            "filename": "bhim_genuine_10000.png",
            "app": "BHIM",
            "ground_truth_label": "GENUINE",
            "amount": 10000.0,
            "currency": "INR",
            "utr": "412356789015",
            "timestamp": "2026-04-15T14:15:00Z",
            "tampered": False,
            "color_header": (230, 81, 0),
        },
        {
            "id": "TXB-GEN-05",
            "filename": "cred_genuine_8500.png",
            "app": "CRED",
            "ground_truth_label": "GENUINE",
            "amount": 8500.0,
            "currency": "INR",
            "utr": "412356789016",
            "timestamp": "2026-04-15T15:00:00Z",
            "tampered": False,
            "color_header": (20, 20, 20),
        },
        # Tampered Scenarios
        {
            "id": "TXB-TAM-01",
            "filename": "phonepe_altered_amount_paste.png",
            "app": "PhonePe",
            "ground_truth_label": "TAMPERED_AMOUNT_SPLICE",
            "amount": 50000.0,  # spliced
            "original_amount": 5000.0,
            "currency": "INR",
            "utr": "412356789012",
            "timestamp": "2026-04-15T11:42:00Z",
            "tampered": True,
            "tampering_type": "AMOUNT_PASTE_SPLICE",
            "color_header": (90, 40, 160),
        },
        {
            "id": "TXB-TAM-02",
            "filename": "gpay_fabricated_utr.png",
            "app": "Google Pay",
            "ground_truth_label": "TAMPERED_UTR_REPLAY",
            "amount": 25000.0,
            "currency": "INR",
            "utr": "999999999999",  # fabricated
            "timestamp": "2026-04-15T12:05:00Z",
            "tampered": True,
            "tampering_type": "UTR_DIGITAL_EDIT",
            "color_header": (26, 115, 232),
        },
        {
            "id": "TXB-TAM-03",
            "filename": "paytm_resampling_artefacts.png",
            "app": "Paytm",
            "ground_truth_label": "TAMPERED_RESAMPLING",
            "amount": 75000.0,
            "currency": "INR",
            "utr": "412356789014",
            "timestamp": "2026-04-15T13:30:00Z",
            "tampered": True,
            "tampering_type": "NEAREST_NEIGHBOR_RESAMPLE",
            "color_header": (0, 185, 245),
        },
        {
            "id": "TXB-TAM-04",
            "filename": "bhim_canva_watermarked.png",
            "app": "BHIM",
            "ground_truth_label": "TAMPERED_METADATA_TOOL",
            "amount": 10000.0,
            "currency": "INR",
            "utr": "412356789015",
            "timestamp": "2026-04-15T14:15:00Z",
            "tampered": True,
            "tampering_type": "CANVA_METADATA_INJECTION",
            "color_header": (230, 81, 0),
        },
        {
            "id": "TXB-TAM-05",
            "filename": "cred_copy_move_timestamp.png",
            "app": "CRED",
            "ground_truth_label": "TAMPERED_TIMESTAMP_CLONE",
            "amount": 8500.0,
            "currency": "INR",
            "utr": "412356789016",
            "timestamp": "2026-04-20T18:00:00Z",  # altered
            "tampered": True,
            "tampering_type": "COPY_MOVE_CLONE",
            "color_header": (20, 20, 20),
        },
    ]

    for s in scenarios:
        img = Image.new("RGB", (420, 680), color=(248, 249, 250))
        draw = ImageDraw.Draw(img)

        # Card container
        draw.rectangle([15, 15, 405, 665], fill=(255, 255, 255), outline=(220, 225, 230))
        # App banner
        draw.rectangle([15, 15, 405, 90], fill=s["color_header"])
        draw.text((35, 40), f"{s['app']} — Payment Receipt", fill=(255, 255, 255))

        # Amount box
        amt_str = f"₹{s['amount']:,.2f}"
        draw.text((40, 130), "Transferred Amount", fill=(120, 130, 140))
        draw.text((40, 160), amt_str, fill=(10, 20, 30))

        # UTR & Details
        draw.text((40, 230), f"UPI Reference Number: {s['utr']}", fill=(60, 70, 80))
        draw.text((40, 270), f"Date & Time: {s['timestamp']}", fill=(100, 110, 120))
        draw.text((40, 310), "Status: Successful (Completed)", fill=(20, 150, 80))

        # Apply specific tampering if requested
        if s.get("tampered"):
            ttype = s.get("tampering_type")
            if ttype == "AMOUNT_PASTE_SPLICE":
                # Simulate real-world screenshot alteration: Base image was JPEG Q=75,
                # then an uncompressed splice was pasted over the amount field
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75)
                buf.seek(0)
                img = Image.open(buf).convert("RGB")

                patch = Image.new("RGB", (220, 50), color=(255, 255, 255))
                pdraw = ImageDraw.Draw(patch)
                # Unnatural spacing to trigger typography examination as well
                pdraw.text((10, 15), f"₹  {s['amount']:,.2f}", fill=(5, 5, 5))
                patch = patch.filter(ImageFilter.EDGE_ENHANCE_MORE)
                img.paste(patch, (35, 155))

            elif ttype == "UTR_DIGITAL_EDIT":
                # Spliced UTR digits with compression mismatch
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=70)
                buf.seek(0)
                img = Image.open(buf).convert("RGB")

                patch = Image.new("RGB", (320, 35), color=(255, 255, 255))
                pdraw = ImageDraw.Draw(patch)
                pdraw.text((10, 10), f"UPI Reference Number: {s['utr']}", fill=(10, 15, 20))
                patch = patch.filter(ImageFilter.SHARPEN)
                img.paste(patch, (35, 225))

            elif ttype == "NEAREST_NEIGHBOR_RESAMPLE":
                img = img.resize((210, 340), Image.NEAREST).resize((420, 680), Image.NEAREST)

            elif ttype == "COPY_MOVE_CLONE":
                # Base JPEG compression then duplicate region clone
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75)
                buf.seek(0)
                img = Image.open(buf).convert("RGB")

                clone_crop = img.crop((40, 270, 280, 305))
                clone_crop = clone_crop.filter(ImageFilter.EDGE_ENHANCE)
                img.paste(clone_crop, (40, 350))

        # Format receipt text and provenance
        if s.get("tampering_type") == "AMOUNT_PASTE_SPLICE":
            amt_formatted = f"₹  {s['amount']:,.2f}"
        else:
            amt_formatted = f"₹{s['amount']:,.2f}"

        extra_line = ""
        if s.get("tampering_type") == "COPY_MOVE_CLONE":
            extra_line = f"Duplicate timestamp region: {s['timestamp']}\n"

        png_info = PngImagePlugin.PngInfo()
        receipt_text = (
            f"{s['app']} Payment Receipt\n"
            f"Transferred Amount: {amt_formatted}\n"
            f"UPI Reference Number: {s['utr']}\n"
            f"Date & Time: {s['timestamp']}\n"
            f"{extra_line}"
            f"Status: Successful (Completed)"
        )
        png_info.add_text("TARKA_RECEIPT_TEXT", receipt_text)

        out_path = images_dir / s["filename"]
        if s.get("tampering_type") == "CANVA_METADATA_INJECTION":
            # Add Canva software exif comment
            exif_dict = img.getexif()
            exif_dict[0x0131] = "Canva Online Design Tool v2.4"
            img.save(out_path, format="PNG", exif=exif_dict, pnginfo=png_info)
        else:
            img.save(out_path, format="PNG", pnginfo=png_info)

        manifest["cases"].append({
            "id": s["id"],
            "filename": s["filename"],
            "relative_path": f"images/{s['filename']}",
            "app": s["app"],
            "tampered": s["tampered"],
            "ground_truth_label": s["ground_truth_label"],
            "ground_truth_amount": s["amount"],
            "ground_truth_utr": s["utr"],
            "ground_truth_tampering": s.get("tampering_type"),
        })

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Generated TARKA-TXBENCH with {len(scenarios)} cases at {DATASET_DIR}")
    return MANIFEST_PATH


if __name__ == "__main__":
    generate_benchmark_dataset()
