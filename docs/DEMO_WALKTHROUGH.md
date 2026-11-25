# TARKA — 3-Minute Live Demo Walkthrough (Golden-Hour Workflow)

This walkthrough uses the repeatable 1-command dataset built by `backend/tools/seed_golden_hour_demo.py` (`1,000,000` transactions, `50` planted mule gangs, device sightings, and matching NCRP cyber complaints).

---

## 0. Honest Benchmark & Seeder Numbers (Tool-by-Tool)

Two separate scripts measure 1,000,000-row performance on this machine (results differ because `validate_mule_scoring.py` runs under `tracemalloc` memory profiling and builds extra planted scenarios + per-signal ablation):

1. **Full Validation & Ablation Benchmark** ([`validate_mule_scoring.py`](file:///e:/new_tarka/tarka_v5/backend/tools/validate_mule_scoring.py) `--rows 1000000 --gangs 50 --extended --out data/validation/independent`, saved in [`bench_1m.json`](file:///e:/new_tarka/tarka_v5/data/validation/independent/bench_1m.json) & [`extended_ablation.json`](file:///e:/new_tarka/tarka_v5/data/validation/independent/extended_ablation.json)):
   - **Ingest (with `tracemalloc` + device log)**: **50.4 s** (**19,836 rows/s**), `20.2 MB` peak Python heap
   - **Analysis**: **48.5 s**, `99.1 MB` peak Python heap
   - **Accuracy**: **Precision 0.993** (`446 / 449`, up from `0.939` before tightening device corroboration and temporal clustering of structuring bands), **Recall 0.989** (`446 / 451`)
   - **Per-signal ablation**:
     - Core (`passthrough + burst + high_value + multi_sender`): `precision 1.000`, `recall 0.989` (`446/446`)
     - Plus structuring signals: `precision 0.993`, `recall 0.989` (`446/449`)
     - Full engine with device attribution: `precision 0.993`, `recall 0.989` (`446/449`), `dormant_mule_recall 1.0`, `structuring_mule_recall 1.0`, `controller attribution 98/102` (`0` carrier-NAT false positives), `time_impossible_link_rejected: true`
   - **Networks**: `107` total (50 planted gangs + planted dormant/structuring/controller/impossible sub-scenarios + 3 background FPs)
2. **One-Command Demo Seeder** ([`seed_golden_hour_demo.py`](file:///e:/new_tarka/tarka_v5/backend/tools/seed_golden_hour_demo.py) `--rows 1000000 --gangs 50`, direct `DerivedStore.ingest_bank_csv` + `ingest_device_csv` without `tracemalloc`):
   - **Ingest**: **14.09 s** (**70,972 rows/s**) into `derived.sqlite`
   - **Analysis**: **20.62 s** (cached thereafter in `derived.sqlite` for fast UI navigation)
   - **Networks found**: **55** components covering the **50 planted gangs** — **53** components come from planted gangs (3 gangs split across non-bridged L2 sub-paths) and **2** extra single-account false-positive components (`user24671@okhdfcbank`, `user19133@ybl`) whose random P2P transfers coincided with ≥ 2 near-limit outflows inside a 72 h window (**Precision 0.991**, `232 / 234` flagged mules)
   - **Flagship syndicate (`NET-7E008CEA`)**: **14 flagged mule accounts**, **6 victims**, **₹13.4 L paid in**, **₹2.8 L recoverable**, **1 controller cluster (`CTRL-DC-001`)**: *"These 14 mule accounts are operated from 2 phones"*
   - **NCRP complaints**: 3 imported (`NCRP-2026-990001`, `NCRP-2026-990002` **MATCHED**; `NCRP-2026-990003` **UNMATCHED** with explicit diagnostic reason — zero invented fields)
3. **IBM AMLworld External Benchmark** ([`benchmark_amlworld.py`](file:///e:/new_tarka/tarka_v5/backend/tools/benchmark_amlworld.py)): **Loader ready, run pending** (full Kaggle dataset is not downloaded locally; schema parser test passes in `test_engine_attribution_upgrade.py`).

```powershell
$env:PYTHONPATH="backend"
venv\Scripts\python backend/tools/seed_golden_hour_demo.py --rows 1000000 --gangs 50 --owner usr-supervisor-01
```

---

## Step-by-Step 3-Minute Script

### Minute 0:00 – 0:45 · NCRP Complaint Import & Case Handover (`Projects`)
1. Open **Projects** (`rail-nav-projects`). Point to **Operation Jamtara · 50-Gang Demo** (`PRJ-D69BBECD`).
2. Show the **Project NCRP complaint import** card (`2/3 matched`):
   - `NCRP-2026-990001` (Raghavendra Rao, `victim0_0@oksbi`, ₹1,80,000, Digital Arrest / Mule Layering) **MATCHED** to 2 ingested rows in `NET-7E008CEA`.
   - `NCRP-2026-990003` (`unseen.citizen@okicici`) **UNMATCHED** with explicit diagnostic reason (*no ingested row mentions this identifier*).
3. Click **Handover** on `CASE-2026-886A726C` to demonstrate officer shift assignment with a note and tamper-evident hash-chained history.
4. Screenshot reference: [01-projects-ncrp.png](file:///e:/new_tarka/tarka_v5/docs/demo/01-projects-ncrp.png)

### Minute 0:45 – 1:20 · Golden-Hour Clock & Scale Triage (`Upload Center` → `Triage`)
1. Open **Evidence → Add evidence (`Upload Center`)** to display verified SHA-256 artifacts alongside the **Golden-Hour Rapid Containment** clock tracking elapsed seconds per milestone (`Complaint received → Statements ingested → Money traced → Mules identified → Freeze notices drafted`, target `< 5 minutes`).
   - Screenshot: [02-upload-golden-hour.png](file:///e:/new_tarka/tarka_v5/docs/demo/02-upload-golden-hour.png)
2. Open **Mule triage**: point out **55 fraud network components across all 50 planted gangs** (`precision 0.991`, `232/234` mules; ingested 1M rows in `14.09 s` directly via `seed_golden_hour_demo.py`, or `50.4 s` / `19,836 rows/s` under full `validate_mule_scoring.py --extended` profiling).
   - Screenshot: [03-triage-50-gangs.png](file:///e:/new_tarka/tarka_v5/docs/demo/03-triage-50-gangs.png)

### Minute 1:20 – 2:05 · Biggest Gang & Device Attribution (`Network`)
1. Open **Network** (`Step 4`) and select **`NET-7E008CEA`** (`₹13.4 L`, `14 mules`, `6 victims`).
2. Highlight the **Controller attribution** panel:
   - **"These 14 mule accounts are operated from 2 phones"** (`IMEI: 358911090000001`, `IMEI: 358911090000002`, shared `BSSID: AA:BB:CC:44:55:01`) with expandable 14-row device sighting evidence.
3. Expand **Time-aware money paths** (`TracesSummaryCard`) to show chronological LIBR money paths from `victim0_0@oksbi` through L1/L2 mules to cash-out vs residual recoverable balances (`₹2.8 L` still in mule accounts in `NET-7E008CEA`).
   - Screenshot: [04-network-14-mules-2-phones.png](file:///e:/new_tarka/tarka_v5/docs/demo/04-network-14-mules-2-phones.png)

### Minute 2:05 – 2:40 · Freeze Notices & Bank Reply Loop (`Actions & report`)
1. Navigate to **Actions & report** (`Step 6`). Point to the Freeze Value ranking queue (`Held ₹ × Retention Likelihood`).
2. Tick accounts, prepare per-bank freeze notices under **BNSS §106/§107**, and toggle **Per bank** grouping in **Notices sent to banks**.
3. Walk a notice through the live **Bank reply loop**: `Sent → Bank acknowledged → Frozen (₹) → Released (with order note)` alongside overdue SLA reminders and the **Network handover** panel.
   - Screenshot: [05-freeze-bank-reply-handover.png](file:///e:/new_tarka/tarka_v5/docs/demo/05-freeze-bank-reply-handover.png)

### Minute 2:40 – 3:00 · Hindi Court Report & Recoverable Summary (`Court report`)
1. Switch to the **Court report** tab, pick **Project** scope, and switch language to **हिन्दी**.
2. Confirm bilingual headers (`जाँच रिपोर्ट`, `पूरा प्रोजेक्ट`), time-aware money paths, controller attribution evidence (`14` accounts / `2` IMEIs), freeze status, SHA-256 artifact fingerprints, and per-section chained SHA-256 seal ready for **Export PDF**.
   - Screenshot: [06-court-report-hindi.png](file:///e:/new_tarka/tarka_v5/docs/demo/06-court-report-hindi.png)
