"""
TARKA-TXBENCH v0.2: Comprehensive Real-World Payment Forensic Evaluation Dataset Generator

Generates a controlled, diverse, scientific evaluation programme across 25 realistic scenarios:
1. Negative Controls (Genuine & Benign Transformations):
   - Pixel, Samsung OneUI, OnePlus, Xiaomi, iPhone 14 Pro, Amazon Pay
   - Benign downscale (bilinear 75%)
   - Benign recompression (WhatsApp WebP / JPEG Q=55)
   - Benign crop & rotation (1.5° receipt box crop)
   - Benign dark-mode high contrast
2. Positive Targets (Tampered & Manipulated):
   - Spliced Amount with kerning gap
   - Altered Recipient VPA & Beneficiary Name
   - Fabricated Repeating UTR (999999999999)
   - Nearest-Neighbor 2x pixel doubling resampling
   - Canva online metadata tool watermark
   - Copy-Move duplicate timestamp clone
   - Cross-app composited receipt
   - AI-inpainted smoothed amount box
   - Synthetic "FakePay v4.1" spoof app interface
   - Double recompressed splice (Q=85 on Q=55 base)
   - Altered status banner (Failed replaced with Successful)
3. Multi-Source Financial Reconstruction Conflicts & Ambiguities:
   - Genuine receipt conflicting with CBS ledger amount (Rs 25k vs Rs 5k)
   - Genuine receipt missing entirely from CBS bank statement
   - Ambiguous multiple candidate matches in statement (two concurrent Rs 4,200 transfers)
   - Timestamp inversion (receipt precedes clearing by 4 hours)

Every sample produces:
- Ground-truth manifest with transformation history
- Original bitstream SHA-256 hash
- Localized manipulation bounding box annotation [ymin, xmin, ymax, xmax] (normalized)
- Associated bank statement CSV for multi-source reconciliation
"""

import io
import json
import os
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, PngImagePlugin


DATASET_DIR = Path("data/txbench_v02")
MANIFEST_PATH = DATASET_DIR / "manifest.json"


def generate_txbench_v02():
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    images_dir = DATASET_DIR / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    statements_dir = DATASET_DIR / "statements"
    statements_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "benchmark_name": "TARKA-TXBENCH",
        "version": "0.2.0-STAGING",
        "description": "Comprehensive Controlled Indian Digital Payment Forensic Benchmark",
        "created_at_iso": "2026-11-23T11:45:00Z",
        "scenarios_count": 25,
        "splits": {
            "negative_controls": 10,
            "positive_tampered": 11,
            "multi_source_conflicts": 4,
        },
        "cases": [],
    }

    scenarios = [
        # =====================================================================
        # 1. NEGATIVE CONTROLS (GENUINE & BENIGN TRANSFORMATIONS)
        # =====================================================================
        {
            "id": "TXB2-GEN-01",
            "filename": "phonepe_pixel_genuine.png",
            "app": "PhonePe",
            "template_version": "v3.24.1",
            "device": {"make": "Google", "model": "Pixel 7", "resolution": [1080, 2400], "os": "Android 14"},
            "amount": 25000.0,
            "currency": "INR",
            "utr": "412356789012",
            "timestamp": "2026-04-15T11:42:00Z",
            "vpa": "vendor.tech@ybl",
            "recipient_name": "Vendor Technologies Pvt Ltd",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (90, 40, 160),
            "bg_color": (248, 249, 250),
        },
        {
            "id": "TXB2-GEN-02",
            "filename": "gpay_samsung_genuine.png",
            "app": "Google Pay",
            "template_version": "v182.1.2",
            "device": {"make": "Samsung", "model": "Galaxy S23", "resolution": [1080, 2340], "os": "Android 14 OneUI 6"},
            "amount": 15000.0,
            "currency": "INR",
            "utr": "412356789013",
            "timestamp": "2026-04-15T12:05:00Z",
            "vpa": "merchant.store@okaxis",
            "recipient_name": "Metro Retailers",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (26, 115, 232),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-GEN-03",
            "filename": "paytm_oneplus_genuine.png",
            "app": "Paytm",
            "template_version": "v10.15.0",
            "device": {"make": "OnePlus", "model": "OnePlus 11", "resolution": [1440, 3216], "os": "OxygenOS 13"},
            "amount": 5000.0,
            "currency": "INR",
            "utr": "412356789014",
            "timestamp": "2026-04-15T13:30:00Z",
            "vpa": "groceries.quick@paytm",
            "recipient_name": "Quick Kirana Express",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (0, 185, 245),
            "bg_color": (245, 248, 252),
        },
        {
            "id": "TXB2-GEN-04",
            "filename": "bhim_redmi_genuine.png",
            "app": "BHIM",
            "template_version": "v2.0.4",
            "device": {"make": "Xiaomi", "model": "Redmi Note 12", "resolution": [1080, 2400], "os": "MIUI 14"},
            "amount": 10000.0,
            "currency": "INR",
            "utr": "412356789015",
            "timestamp": "2026-04-15T14:15:00Z",
            "vpa": "services.fee@upi",
            "recipient_name": "State Utility Services",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (230, 81, 0),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-GEN-05",
            "filename": "cred_iphone_genuine.png",
            "app": "CRED",
            "template_version": "v4.55.0",
            "device": {"make": "Apple", "model": "iPhone 14 Pro", "resolution": [1179, 2556], "os": "iOS 17.2"},
            "amount": 8500.0,
            "currency": "INR",
            "utr": "412356789016",
            "timestamp": "2026-04-15T15:00:00Z",
            "vpa": "luxury.dining@credpay",
            "recipient_name": "Heritage Fine Dining",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (18, 18, 18),
            "bg_color": (28, 28, 30),
        },
        {
            "id": "TXB2-GEN-BEN-06",
            "filename": "amazon_pay_genuine.png",
            "app": "Amazon Pay",
            "template_version": "v24.2.0",
            "device": {"make": "Motorola", "model": "Edge 40", "resolution": [1080, 2400], "os": "Android 13"},
            "amount": 3400.0,
            "currency": "INR",
            "utr": "412356789017",
            "timestamp": "2026-04-15T16:10:00Z",
            "vpa": "books.direct@apl",
            "recipient_name": "Direct Bookstore",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["TEMPLATE_VARIATION"],
            "manipulated_region_bbox": None,
            "color_header": (255, 153, 0),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-GEN-BEN-07",
            "filename": "gpay_benign_downscaled_75.png",
            "app": "Google Pay",
            "template_version": "v182.1.2",
            "device": {"make": "Samsung", "model": "Galaxy S23", "resolution": [810, 1755], "os": "Android 14"},
            "amount": 12500.0,
            "currency": "INR",
            "utr": "412356789018",
            "timestamp": "2026-04-15T16:45:00Z",
            "vpa": "hardware.tools@okaxis",
            "recipient_name": "Industrial Hardware Supplies",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["BILINEAR_DOWNSCALE_75"],
            "manipulated_region_bbox": None,
            "color_header": (26, 115, 232),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-GEN-BEN-08",
            "filename": "phonepe_benign_whatsapp_q55.png",
            "app": "PhonePe",
            "template_version": "v3.24.1",
            "device": {"make": "Google", "model": "Pixel 7", "resolution": [1080, 2400], "os": "Android 14"},
            "amount": 9200.0,
            "currency": "INR",
            "utr": "412356789019",
            "timestamp": "2026-04-15T17:15:00Z",
            "vpa": "clinic.care@ybl",
            "recipient_name": "City Healthcare Diagnostics",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["WHATSAPP_JPEG_RECOMPRESSION_Q55"],
            "manipulated_region_bbox": None,
            "color_header": (90, 40, 160),
            "bg_color": (248, 249, 250),
        },
        {
            "id": "TXB2-GEN-BEN-09",
            "filename": "paytm_benign_crop_tilt.png",
            "app": "Paytm",
            "template_version": "v10.15.0",
            "device": {"make": "OnePlus", "model": "OnePlus 11", "resolution": [1000, 1500], "os": "OxygenOS 13"},
            "amount": 4500.0,
            "currency": "INR",
            "utr": "412356789020",
            "timestamp": "2026-04-15T18:00:00Z",
            "vpa": "fuel.point@paytm",
            "recipient_name": "Highway Fuel Station",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["RECEIPT_CARD_CROP_AND_1.5DEG_ROTATION"],
            "manipulated_region_bbox": None,
            "color_header": (0, 185, 245),
            "bg_color": (245, 248, 252),
        },
        {
            "id": "TXB2-GEN-BEN-10",
            "filename": "cred_benign_darkmode.png",
            "app": "CRED",
            "template_version": "v4.55.0",
            "device": {"make": "Apple", "model": "iPhone 14 Pro", "resolution": [1179, 2556], "os": "iOS 17.2"},
            "amount": 16000.0,
            "currency": "INR",
            "utr": "412356789021",
            "timestamp": "2026-04-15T18:30:00Z",
            "vpa": "electronics.hub@credpay",
            "recipient_name": "Premium Electronics",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "NONE",
            "benign_transformations": ["DARK_MODE_HIGH_CONTRAST"],
            "manipulated_region_bbox": None,
            "color_header": (15, 15, 15),
            "bg_color": (24, 24, 26),
        },

        # =====================================================================
        # 2. POSITIVE TARGETS (TAMPERED & MANIPULATED)
        # =====================================================================
        {
            "id": "TXB2-TAM-01",
            "filename": "phonepe_spliced_amount.png",
            "app": "PhonePe",
            "template_version": "v3.24.1",
            "device": {"make": "Google", "model": "Pixel 7", "resolution": [1080, 2400], "os": "Android 14"},
            "amount": 120000.0,  # spliced from 1200.0
            "original_amount": 1200.0,
            "currency": "INR",
            "utr": "412356789022",
            "timestamp": "2026-04-16T10:00:00Z",
            "vpa": "wholesaler@ybl",
            "recipient_name": "Apex Wholesale Traders",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "AMOUNT_SPLICE_KERNING_GAP",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.22, 0.08, 0.32, 0.65],
            "color_header": (90, 40, 160),
            "bg_color": (248, 249, 250),
        },
        {
            "id": "TXB2-TAM-02",
            "filename": "gpay_altered_recipient_vpa.png",
            "app": "Google Pay",
            "template_version": "v182.1.2",
            "device": {"make": "Samsung", "model": "Galaxy S23", "resolution": [1080, 2340], "os": "Android 14"},
            "amount": 35000.0,
            "currency": "INR",
            "utr": "412356789023",
            "timestamp": "2026-04-16T10:30:00Z",
            "vpa": "scammer.mule@ibl",  # altered recipient VPA
            "recipient_name": "Legitimate Merchant Name",  # name/vpa mismatch
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "RECIPIENT_VPA_ALTERATION",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.36, 0.08, 0.44, 0.85],
            "color_header": (26, 115, 232),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-TAM-03",
            "filename": "paytm_fabricated_repeating_utr.png",
            "app": "Paytm",
            "template_version": "v10.15.0",
            "device": {"make": "OnePlus", "model": "OnePlus 11", "resolution": [1440, 3216], "os": "OxygenOS 13"},
            "amount": 45000.0,
            "currency": "INR",
            "utr": "999999999999",  # fabricated repeating UTR
            "timestamp": "2026-04-16T11:00:00Z",
            "vpa": "fast.pay@paytm",
            "recipient_name": "Fast Distribution Hub",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "UTR_FABRICATION_REPEATING",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.45, 0.08, 0.52, 0.90],
            "color_header": (0, 185, 245),
            "bg_color": (245, 248, 252),
        },
        {
            "id": "TXB2-TAM-04",
            "filename": "bhim_resampled_pixel_doubling.png",
            "app": "BHIM",
            "template_version": "v2.0.4",
            "device": {"make": "Xiaomi", "model": "Redmi Note 12", "resolution": [1080, 2400], "os": "MIUI 14"},
            "amount": 65000.0,
            "currency": "INR",
            "utr": "412356789025",
            "timestamp": "2026-04-16T11:30:00Z",
            "vpa": "bhim.vendor@upi",
            "recipient_name": "Rural Cooperatives Ltd",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "NEAREST_NEIGHBOR_RESAMPLE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.0, 0.0, 1.0, 1.0],
            "color_header": (230, 81, 0),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-TAM-05",
            "filename": "cred_canva_watermarked.png",
            "app": "CRED",
            "template_version": "v4.55.0",
            "device": {"make": "Apple", "model": "iPhone 14 Pro", "resolution": [1179, 2556], "os": "iOS 17.2"},
            "amount": 28000.0,
            "currency": "INR",
            "utr": "412356789026",
            "timestamp": "2026-04-16T12:00:00Z",
            "vpa": "luxury.jewels@credpay",
            "recipient_name": "Royal Jewel Craft",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "CANVA_METADATA_INJECTION",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.0, 0.0, 0.10, 0.10],
            "color_header": (18, 18, 18),
            "bg_color": (28, 28, 30),
        },
        {
            "id": "TXB2-TAM-06",
            "filename": "amazon_copy_move_timestamp.png",
            "app": "Amazon Pay",
            "template_version": "v24.2.0",
            "device": {"make": "Motorola", "model": "Edge 40", "resolution": [1080, 2400], "os": "Android 13"},
            "amount": 19500.0,
            "currency": "INR",
            "utr": "412356789027",
            "timestamp": "2026-04-16T12:30:00Z",
            "vpa": "supplier.order@apl",
            "recipient_name": "Prime Logistics Suppliers",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "COPY_MOVE_CLONE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.52, 0.08, 0.60, 0.70],
            "color_header": (255, 153, 0),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-TAM-07",
            "filename": "cross_app_composited_receipt.png",
            "app": "PhonePe",
            "template_version": "v3.24.1",
            "device": {"make": "Google", "model": "Pixel 7", "resolution": [1080, 2400], "os": "Android 14"},
            "amount": 80000.0,
            "currency": "INR",
            "utr": "412356789028",
            "timestamp": "2026-04-16T13:00:00Z",
            "vpa": "composite.target@okaxis",
            "recipient_name": "GPay Card Body in PhonePe Frame",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "CROSS_APP_COMPOSITING",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.15, 0.05, 0.85, 0.95],
            "color_header": (90, 40, 160),
            "bg_color": (248, 249, 250),
        },
        {
            "id": "TXB2-TAM-08",
            "filename": "ai_inpainted_amount_patch.png",
            "app": "Google Pay",
            "template_version": "v182.1.2",
            "device": {"make": "Samsung", "model": "Galaxy S23", "resolution": [1080, 2340], "os": "Android 14"},
            "amount": 72000.0,
            "currency": "INR",
            "utr": "412356789029",
            "timestamp": "2026-04-16T13:30:00Z",
            "vpa": "inpaint.test@okaxis",
            "recipient_name": "Inpaint Hardware Ltd",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "AI_INPAINTED_PATCH",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.22, 0.08, 0.32, 0.70],
            "color_header": (26, 115, 232),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-TAM-09",
            "filename": "synthetic_fakepay_spoof_ui.png",
            "app": "FakePay",
            "template_version": "v4.1.0-SPOOF",
            "device": {"make": "Unknown", "model": "Emulator", "resolution": [1080, 1920], "os": "Android 11"},
            "amount": 55000.0,
            "currency": "INR",
            "utr": "000012345678",  # malformed prefix
            "timestamp": "2026-04-16T14:00:00Z",
            "vpa": "spoof.fake@fakepay",
            "recipient_name": "Fake Spoof Generator App",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "SYNTHETIC_SPOOF_APP_UI",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.0, 0.0, 1.0, 1.0],
            "color_header": (80, 30, 140),
            "bg_color": (240, 240, 240),
        },
        {
            "id": "TXB2-TAM-10",
            "filename": "double_recompressed_splice.png",
            "app": "Paytm",
            "template_version": "v10.15.0",
            "device": {"make": "OnePlus", "model": "OnePlus 11", "resolution": [1440, 3216], "os": "OxygenOS 13"},
            "amount": 95000.0,
            "currency": "INR",
            "utr": "412356789031",
            "timestamp": "2026-04-16T14:30:00Z",
            "vpa": "double.compress@paytm",
            "recipient_name": "Double Recompressed Splice Ltd",
            "status": "SUCCESS",
            "tampered": True,
            "tampering_category": "DOUBLE_RECOMPRESSION_SPLICE",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.22, 0.08, 0.32, 0.70],
            "color_header": (0, 185, 245),
            "bg_color": (245, 248, 252),
        },
        {
            "id": "TXB2-TAM-11",
            "filename": "altered_status_failed_to_success.png",
            "app": "BHIM",
            "template_version": "v2.0.4",
            "device": {"make": "Xiaomi", "model": "Redmi Note 12", "resolution": [1080, 2400], "os": "MIUI 14"},
            "amount": 18000.0,
            "currency": "INR",
            "utr": "412356789032",
            "timestamp": "2026-04-16T15:00:00Z",
            "vpa": "status.fraud@upi",
            "recipient_name": "Altered Status Beneficiary",
            "status": "SUCCESS",  # original was FAILED
            "tampered": True,
            "tampering_category": "STATUS_BANNER_ALTERATION",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": [0.60, 0.08, 0.68, 0.85],
            "color_header": (230, 81, 0),
            "bg_color": (255, 255, 255),
        },

        # =====================================================================
        # 3. MULTI-SOURCE FINANCIAL RECONSTRUCTION CONFLICTS & AMBIGUITIES
        # =====================================================================
        {
            "id": "TXB2-REC-01",
            "filename": "cbs_amount_mismatch_genuine_look.png",
            "app": "PhonePe",
            "template_version": "v3.24.1",
            "device": {"make": "Google", "model": "Pixel 7", "resolution": [1080, 2400], "os": "Android 14"},
            "amount": 25000.0,  # receipt claims 25k, CBS statement has 5k
            "cbs_ledger_amount": 5000.0,
            "currency": "INR",
            "utr": "412356789033",
            "timestamp": "2026-04-17T09:00:00Z",
            "vpa": "cbs.conflict@ybl",
            "recipient_name": "CBS Contradiction Merchant",
            "status": "SUCCESS",
            "tampered": False,  # image bitstream itself is clean/re-generated
            "tampering_category": "CBS_FINANCIAL_AMOUNT_CONTRADICTION",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (90, 40, 160),
            "bg_color": (248, 249, 250),
        },
        {
            "id": "TXB2-REC-02",
            "filename": "cbs_missing_utr_unrecorded.png",
            "app": "Google Pay",
            "template_version": "v182.1.2",
            "device": {"make": "Samsung", "model": "Galaxy S23", "resolution": [1080, 2340], "os": "Android 14"},
            "amount": 31000.0,
            "cbs_ledger_amount": None,  # absent from bank statement
            "currency": "INR",
            "utr": "412356789034",
            "timestamp": "2026-04-17T10:15:00Z",
            "vpa": "missing.utr@okaxis",
            "recipient_name": "Ghost Merchant Entity",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "CBS_MISSING_TRANSACTION",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (26, 115, 232),
            "bg_color": (255, 255, 255),
        },
        {
            "id": "TXB2-REC-03",
            "filename": "ambiguous_multiple_matches.png",
            "app": "Paytm",
            "template_version": "v10.15.0",
            "device": {"make": "OnePlus", "model": "OnePlus 11", "resolution": [1440, 3216], "os": "OxygenOS 13"},
            "amount": 4200.0,
            "cbs_ledger_amount": 4200.0,  # two identical transactions in statement!
            "currency": "INR",
            "utr": "412356789035",
            "timestamp": "2026-04-17T11:00:00Z",
            "vpa": "dual.entry@paytm",
            "recipient_name": "Coffee Roasters Hub",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "AMBIGUOUS_MULTIPLE_CANDIDATES",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (0, 185, 245),
            "bg_color": (245, 248, 252),
        },
        {
            "id": "TXB2-REC-04",
            "filename": "timing_inversion_sequence.png",
            "app": "BHIM",
            "template_version": "v2.0.4",
            "device": {"make": "Xiaomi", "model": "Redmi Note 12", "resolution": [1080, 2400], "os": "MIUI 14"},
            "amount": 14000.0,
            "cbs_ledger_amount": 14000.0,
            "currency": "INR",
            "utr": "412356789036",
            "timestamp": "2026-04-17T06:00:00Z",  # receipt claims 06:00 AM, but clearing was 10:30 AM
            "cbs_clearing_time": "2026-04-17T10:30:00Z",
            "vpa": "timing.drift@upi",
            "recipient_name": "Timing Inversion Logistics",
            "status": "SUCCESS",
            "tampered": False,
            "tampering_category": "TEMPORAL_SEQUENCE_INVERSION",
            "benign_transformations": ["NONE"],
            "manipulated_region_bbox": None,
            "color_header": (230, 81, 0),
            "bg_color": (255, 255, 255),
        },
    ]

    for s in scenarios:
        # Create base card image
        w, h = 420, 680
        img = Image.new("RGB", (w, h), color=s["bg_color"])
        draw = ImageDraw.Draw(img)

        # Container card with drop border
        draw.rectangle([15, 15, w - 15, h - 15], fill=(255, 255, 255) if s["bg_color"] != (28, 28, 30) else (34, 34, 36), outline=(215, 220, 225))
        # Top banner
        draw.rectangle([15, 15, w - 15, 90], fill=s["color_header"])
        draw.text((35, 40), f"{s['app']} — Payment Receipt", fill=(255, 255, 255))

        # Amount box
        amt_str = f"₹{s['amount']:,.2f}"
        draw.text((40, 125), "Transferred Amount", fill=(120, 130, 140))
        draw.text((40, 155), amt_str, fill=(10, 20, 30) if s["bg_color"] != (28, 28, 30) else (240, 240, 240))

        # Recipient details
        draw.text((40, 210), f"Paid to: {s['recipient_name']}", fill=(40, 50, 60))
        draw.text((40, 235), f"UPI ID: {s['vpa']}", fill=(80, 90, 100))

        # UTR & Details
        draw.text((40, 280), f"UPI Reference Number: {s['utr']}", fill=(50, 60, 70))
        draw.text((40, 310), f"Date & Time: {s['timestamp']}", fill=(90, 100, 110))
        draw.text((40, 345), f"Status: {s['status']} (Completed)", fill=(20, 150, 80))

        # -----------------------------------------------------------------
        # Specific Transformations & Tampering
        # -----------------------------------------------------------------
        ttype = s.get("tampering_category")
        btype = s.get("benign_transformations", ["NONE"])[0]

        # Benign transformations
        if btype == "BILINEAR_DOWNSCALE_75":
            img = img.resize((315, 510), Image.BILINEAR).resize((420, 680), Image.BILINEAR)

        elif btype == "WHATSAPP_JPEG_RECOMPRESSION_Q55":
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=55)
            buf.seek(0)
            img = Image.open(buf).convert("RGB")

        elif btype == "RECEIPT_CARD_CROP_AND_1.5DEG_ROTATION":
            img = img.crop((10, 10, w - 10, h - 10)).rotate(1.5, resample=Image.BICUBIC, expand=True)
            img = img.resize((420, 680), Image.BICUBIC)

        # Tampered transformations
        if s.get("tampered"):
            if ttype == "AMOUNT_SPLICE_KERNING_GAP":
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75)
                buf.seek(0)
                img = Image.open(buf).convert("RGB")

                patch = Image.new("RGB", (230, 50), color=(255, 255, 255))
                pdraw = ImageDraw.Draw(patch)
                pdraw.text((10, 15), f"₹  {s['amount']:,.2f}", fill=(5, 5, 5))
                patch = patch.filter(ImageFilter.EDGE_ENHANCE_MORE)
                img.paste(patch, (35, 150))

            elif ttype == "RECIPIENT_VPA_ALTERATION":
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75)
                buf.seek(0)
                img = Image.open(buf).convert("RGB")

                patch = Image.new("RGB", (280, 45), color=(255, 255, 255))
                pdraw = ImageDraw.Draw(patch)
                pdraw.text((5, 5), f"UPI ID: {s['vpa']}", fill=(180, 20, 20))
                pdraw.text((5, 25), "Beneficiary verified manually", fill=(100, 100, 100))
                patch = patch.filter(ImageFilter.SHARPEN)
                img.paste(patch, (35, 230))

            elif ttype == "NEAREST_NEIGHBOR_RESAMPLE":
                img = img.resize((210, 340), Image.NEAREST).resize((420, 680), Image.NEAREST)

            elif ttype == "COPY_MOVE_CLONE":
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75)
                buf.seek(0)
                img = Image.open(buf).convert("RGB")

                clone_crop = img.crop((40, 310, 280, 340))
                clone_crop = clone_crop.filter(ImageFilter.EDGE_ENHANCE)
                img.paste(clone_crop, (40, 390))

            elif ttype == "CROSS_APP_COMPOSITING":
                # GPay colored banner pasted into PhonePe container
                cpatch = Image.new("RGB", (380, 80), color=(26, 115, 232))
                cdraw = ImageDraw.Draw(cpatch)
                cdraw.text((20, 30), "Google Pay Core — Spliced Frame", fill=(255, 255, 255))
                img.paste(cpatch, (20, 20))

            elif ttype == "AI_INPAINTED_PATCH":
                # Smooth/blur over amount area then write crisp text
                blurred = img.crop((35, 150, 260, 200)).filter(ImageFilter.GaussianBlur(radius=3))
                img.paste(blurred, (35, 150))
                draw = ImageDraw.Draw(img)
                draw.text((40, 155), f"₹{s['amount']:,.2f}", fill=(5, 5, 5))

            elif ttype == "SYNTHETIC_SPOOF_APP_UI":
                # Render non-standard fake receipt with odd layout
                img = Image.new("RGB", (420, 680), color=(235, 235, 240))
                draw = ImageDraw.Draw(img)
                draw.rectangle([20, 20, 400, 660], fill=(255, 255, 255), outline=(150, 150, 150))
                draw.rectangle([20, 20, 400, 75], fill=(80, 30, 140))
                draw.text((35, 35), "FakePay v4.1 (Simulated Receipt)", fill=(255, 255, 255))
                draw.text((40, 140), f"Amount Paid: ₹{s['amount']:,.2f}", fill=(0, 0, 0))
                draw.text((40, 200), f"Ref ID: {s['utr']}", fill=(80, 80, 80))
                draw.text((40, 250), "Transaction Status: OK", fill=(0, 120, 50))

            elif ttype == "DOUBLE_RECOMPRESSION_SPLICE":
                # Base image compressed at Q=50, spliced text patch compressed at Q=85
                buf1 = io.BytesIO()
                img.save(buf1, format="JPEG", quality=50)
                buf1.seek(0)
                base_jpg = Image.open(buf1).convert("RGB")

                patch = Image.new("RGB", (220, 50), color=(255, 255, 255))
                pdraw = ImageDraw.Draw(patch)
                pdraw.text((10, 15), f"₹{s['amount']:,.2f}", fill=(5, 5, 5))
                buf2 = io.BytesIO()
                patch.save(buf2, format="JPEG", quality=85)
                buf2.seek(0)
                patch_jpg = Image.open(buf2)
                base_jpg.paste(patch_jpg, (35, 150))
                img = base_jpg

            elif ttype == "STATUS_BANNER_ALTERATION":
                # Paste green success badge over red failure
                spatch = Image.new("RGB", (250, 40), color=(230, 255, 230))
                sdraw = ImageDraw.Draw(spatch)
                sdraw.text((10, 10), "Status: SUCCESS (Paid)", fill=(20, 140, 40))
                img.paste(spatch, (35, 340))

        # Format provenance text for OCR fallback
        amt_disp = f"₹  {s['amount']:,.2f}" if ttype == "AMOUNT_SPLICE_KERNING_GAP" else f"₹{s['amount']:,.2f}"
        extra_txt = ""
        if ttype == "COPY_MOVE_CLONE":
            extra_txt = f"Duplicate timestamp region: {s['timestamp']}\n"

        png_info = PngImagePlugin.PngInfo()
        receipt_text = (
            f"{s['app']} Payment Receipt\n"
            f"Transferred Amount: {amt_disp}\n"
            f"Paid to: {s['recipient_name']}\n"
            f"UPI ID: {s['vpa']}\n"
            f"UPI Reference Number: {s['utr']}\n"
            f"Date & Time: {s['timestamp']}\n"
            f"{extra_txt}"
            f"Status: {s['status']} (Completed)"
        )
        png_info.add_text("TARKA_RECEIPT_TEXT", receipt_text)

        out_path = images_dir / s["filename"]
        if ttype == "CANVA_METADATA_INJECTION":
            exif_dict = img.getexif()
            exif_dict[0x0131] = "Canva Online Design Tool v2.4"
            img.save(out_path, format="PNG", exif=exif_dict, pnginfo=png_info)
        else:
            img.save(out_path, format="PNG", pnginfo=png_info)

        with open(out_path, "rb") as fp:
            file_sha = hashlib.sha256(fp.read()).hexdigest()

        # Add scenario to manifest
        manifest["cases"].append({
            "id": s["id"],
            "filename": s["filename"],
            "relative_path": f"images/{s['filename']}",
            "app": s["app"],
            "template_version": s["template_version"],
            "device": s["device"],
            "tampered": s["tampered"],
            "tampering_category": s["tampering_category"],
            "benign_transformations": s["benign_transformations"],
            "manipulated_region_bbox": s["manipulated_region_bbox"],
            "ground_truth_fields": {
                "amount": s["amount"],
                "currency": s["currency"],
                "utr": s["utr"],
                "timestamp": s["timestamp"],
                "vpa": s["vpa"],
                "recipient_name": s["recipient_name"],
                "status": s["status"],
            },
            "sha256_original": file_sha,
            "cbs_ledger_amount": s.get("cbs_ledger_amount", s["amount"]),
            "cbs_clearing_time": s.get("cbs_clearing_time", s["timestamp"]),
        })

    # Write manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # -----------------------------------------------------------------
    # Generate Authoritative CBS Statement CSV for Multi-Source Testing
    # -----------------------------------------------------------------
    statement_file = statements_dir / "cbs_statement_q1_2026.csv"
    lines = [
        "TxID,ValueDate,ClearanceDate,ReferenceNumber,Description,Debit,Credit,Balance,Status",
        # Balance forward: 250,000.00
        "TX-001,2026-04-15 11:42:00,2026-04-15 11:42:05,412356789012,UPI/412356789012/vendor.tech@ybl/PhonePe,25000.00,0.00,225000.00,CLEARED",
        "TX-002,2026-04-15 12:05:00,2026-04-15 12:05:04,412356789013,UPI/412356789013/merchant.store@okaxis/GPay,15000.00,0.00,210000.00,CLEARED",
        "TX-003,2026-04-15 13:30:00,2026-04-15 13:30:08,412356789014,UPI/412356789014/groceries.quick@paytm/Paytm,5000.00,0.00,205000.00,CLEARED",
        "TX-004,2026-04-15 14:15:00,2026-04-15 14:15:03,412356789015,UPI/412356789015/services.fee@upi/BHIM,10000.00,0.00,195000.00,CLEARED",
        "TX-005,2026-04-15 15:00:00,2026-04-15 15:00:10,412356789016,UPI/412356789016/luxury.dining@credpay/CRED,8500.00,0.00,186500.00,CLEARED",
        # Multi-source conflict TXB2-REC-01: Statement has only 5000.00 debit!
        "TX-006,2026-04-17 09:00:00,2026-04-17 09:00:05,412356789033,UPI/412356789033/cbs.conflict@ybl/ActualBankDebit,5000.00,0.00,181500.00,CLEARED",
        # Multi-source ambiguous candidate matches TXB2-REC-03: Two transfers of 4,200.00!
        "TX-007,2026-04-17 11:00:00,2026-04-17 11:00:02,412356789035,UPI/412356789035/dual.entry@paytm/LegA,4200.00,0.00,177300.00,CLEARED",
        "TX-008,2026-04-17 11:02:30,2026-04-17 11:02:34,412356789035B,UPI/412356789035B/dual.entry@paytm/LegB,4200.00,0.00,173100.00,CLEARED",
        # Timing inversion TXB2-REC-04: Cleared at 10:30 AM
        "TX-009,2026-04-17 10:30:00,2026-04-17 10:30:15,412356789036,UPI/412356789036/timing.drift@upi/DelayedClearance,14000.00,0.00,159100.00,CLEARED",
        # Reversal sequence: TX-010 debit reversed by TX-011 credit
        "TX-010,2026-04-18 14:00:00,2026-04-18 14:00:05,412356789099,UPI/412356789099/reversed.merchant@upi/POS,7500.00,0.00,151600.00,FAILED_AUTO_REVERSAL",
        "TX-011,2026-04-18 14:05:00,2026-04-18 14:05:02,412356789099REV,REV/UPI/412356789099/AutoReversalCredit,0.00,7500.00,159100.00,CLEARED",
    ]
    with open(statement_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Generated TARKA-TXBENCH v0.2 with {len(scenarios)} cases at {DATASET_DIR}")
    print(f"Generated CBS statement with 11 transactions at {statement_file}")
    return MANIFEST_PATH


if __name__ == "__main__":
    generate_txbench_v02()
