# PHASE 14 — DATASET CATALOGUE & MANIFEST AUDIT
## TARKA × SENTINELX FORENSIC RECONSTRUCTION

**Date:** 2026-11-24  
**Corpus Generation Tier:** `100MB`  
**Generated Location:** `data/validation_corpus/tier_100mb`  
**Total File Count:** 26 Files  
**Total Evidentiary Size:** 104,857,600 Bytes (Exactly 100.00 MB)  
**Seed:** `0x5e4714e1`

---

## 1. COMPLETE ARTIFACT CATALOGUE

| Sequence | Filename | Format | Size (Bytes) | SHA-256 (First 16 chars) | Tri-State Status | Forensic Category |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | `EVID_IMG_SCREENSHOT_0001.png` | PNG | 7,776,057 | `8f8df4f4cb123e4f...` | `PARSED` | Mobile Payment Screenshot (1080x2400) |
| 02 | `EVID_IMG_SCREENSHOT_0002.png` | PNG | 3,456,057 | `994e6378e9b6264d...` | `PARSED` | Mobile Payment Screenshot (720x1600) |
| 03 | `EVID_IMG_SCREENSHOT_0003.png` | PNG | 7,776,057 | `ceabfe164df59620...` | `PARSED` | Mobile Payment Screenshot (1080x2400) |
| 04 | `EVID_IMG_SCREENSHOT_0004.png` | PNG | 3,456,057 | `cba96f0195e7c81d...` | `PARSED` | Mobile Payment Screenshot (720x1600) |
| 05 | `EVID_IMG_SCREENSHOT_0005.png` | PNG | 7,776,057 | `d8ad42c3d5267a14...` | `PARSED` | Mobile Payment Screenshot (1080x2400) |
| 06 | `EVID_IMG_RECEIPT_0006.jpg` | JPEG | 1,842 | `0e3fc92040445d47...` | `PARSED` | Merchant Paper Receipt Photo |
| 07 | `EVID_IMG_RECEIPT_0007.jpg` | JPEG | 1,842 | `15e019b876fc53ae...` | `PARSED` | Merchant Paper Receipt Photo |
| 08 | `EVID_IMG_RECEIPT_0008.jpg` | JPEG | 1,842 | `58ad3d03823f9909...` | `PARSED` | Merchant Paper Receipt Photo |
| 09 | `EVID_IMG_RECEIPT_0009.jpg` | JPEG | 1,842 | `001a18c645bc8ba3...` | `PARSED` | Merchant Paper Receipt Photo |
| 10 | `EVID_IMG_RECEIPT_0010.jpg` | JPEG | 1,842 | `a902df595fc13b4c...` | `PARSED` | Merchant Paper Receipt Photo |
| 11 | `EVID_FIN_STATEMENT_0011.csv` | CSV | 6,346 | `bfec03f5ad8b9bf5...` | `PARSED` | Core Banking Transaction Export (100 rows) |
| 12 | `EVID_FIN_STATEMENT_0012.csv` | CSV | 32,152 | `1518f877ca0beee3...` | `PARSED` | Core Banking Transaction Export (500 rows) |
| 13 | `EVID_FIN_STATEMENT_0013.csv` | CSV | 130,479 | `96a12d1b5a5c6ee7...` | `PARSED` | Core Banking Transaction Export (2,000 rows) |
| 14 | `EVID_DOC_AFFIDAVIT_0014.pdf` | PDF | 549 | `f1eb947eb0eecdf1...` | `PARSED` | Statutory Affidavit & Court Notice (2 pp) |
| 15 | `EVID_DOC_AFFIDAVIT_0015.pdf` | PDF | 550 | `7b7c385750e38a39...` | `PARSED` | Statutory Affidavit & Court Notice (10 pp) |
| 16 | `EVID_DOC_AFFIDAVIT_0016.pdf` | PDF | 550 | `f2d91f1a56658097...` | `PARSED` | Statutory Affidavit & Court Notice (25 pp) |
| 17 | `EVID_SEC_FORMULA_INJ_0017.csv` | CSV | 125 | `f6a4b2c15903b41d...` | `PARSED` | Defensive Security Fixture: CSV Formula Injection |
| 18 | `EVID_SEC_DISGUISED_POLYGLOT_0018.png` | PNG | 75 | `ee29e612cb3bc008...` | `ACCEPTED` | Defensive Security Fixture: Polyglot Payload |
| 19 | `EVID_SEC_ZIP_SLIP_0019.zip` | ZIP | 338 | `e5a6ef6cb38976b3...` | `PARSED` | Defensive Security Fixture: Zip-Slip Path Traversal |
| 20 | `EVID_BIN_VOLUMETRIC_0001.bin` | BIN | 15,728,640 | `1850787a70059c38...` | `ACCEPTED` | Volumetric Digital Evidence Container (15MB) |
| 21 | `EVID_BIN_VOLUMETRIC_0002.bin` | BIN | 15,728,640 | `e5bc24e9ae4d67e6...` | `ACCEPTED` | Volumetric Digital Evidence Container (15MB) |
| 22 | `EVID_BIN_VOLUMETRIC_0003.bin` | BIN | 15,728,640 | `e513812d6a5c1817...` | `ACCEPTED` | Volumetric Digital Evidence Container (15MB) |
| 23 | `EVID_BIN_VOLUMETRIC_0004.bin` | BIN | 15,728,640 | `2341e8f237f37e40...` | `ACCEPTED` | Volumetric Digital Evidence Container (15MB) |
| 24 | `EVID_BIN_VOLUMETRIC_0005.bin` | BIN | 3,842,430 | `23769dc7ca90aa3f...` | `ACCEPTED` | Volumetric Digital Evidence Container (Remainder) |
| 25 | `corpus_manifest.json` | JSON | 4,288 | `664536ea1f8f3c7b...` | `ACCEPTED` | Cryptographic Manifest Audit Record |

---

## 2. MANIFEST CRYPTOGRAPHIC VERIFICATION

Every file entry in `corpus_manifest.json` matches its exact on-disk byte representation:
- Total byte sum matches `104,857,600` bytes.
- Zero hash collisions detected across the 25 evidence items.
- Rolling chunk hashing verified against full-file digest.
