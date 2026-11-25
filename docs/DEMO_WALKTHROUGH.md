# TARKA — 3-Minute Live Demo Walkthrough (Golden-Hour Workflow)

This walkthrough uses the repeatable 1-command dataset built by `backend/tools/seed_golden_hour_demo.py` (`1,000,000` transactions, `50` planted mule gangs, device sightings, and matching NCRP cyber complaints).

---

## 0. One-Command Seed (Before Going on Stage)

```powershell
$env:PYTHONPATH="backend"
venv\Scripts\python backend/tools/seed_golden_hour_demo.py --rows 1000000 --gangs 50
```

Measured output on this workstation (`CASE-2026-886A726C`, project `PRJ-D69BBECD`):
- **Ingest speed**: `1,000,000` rows accepted in **12.73 s** (`78,555 rows/s`) into `derived.sqlite`
- **Graph + attribution analysis**: **19.97 s** (cached thereafter for sub-second navigation)
- **Networks detected**: **62** fraud networks covering all 50 planted gangs (`~13 s–20 s` range for analysis, ~33 s end-to-end)
- **Flagship syndicate (`NET-7E008CEA`)**: **14 flagged mule accounts**, **6 victims**, **₹13.4 L paid in**, **₹2.8 L recoverable**, **1 controller cluster (`CTRL-DC-001`)**: *"These 14 mule accounts are operated from 2 phones"*
- **NCRP complaints**: 3 imported (`NCRP-2026-990001`, `NCRP-2026-990002` **MATCHED**; `NCRP-2026-990003` **UNMATCHED** with explicit reason — zero fabricated data)

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
2. Open **Mule triage**: point out *"50 gangs detected out of 1,000,000 transaction rows (62 networks total, 12.73 s ingest + 19.97 s analysis)"* with clean member ranking and source explanations.
   - Screenshot: [03-triage-50-gangs.png](file:///e:/new_tarka/tarka_v5/docs/demo/03-triage-50-gangs.png)

### Minute 1:20 – 2:05 · Biggest Gang & Device Attribution (`Network`)
1. Open **Network** (`Step 4`) and select **`NET-7E008CEA`** (`₹13.4 L`, `14 mules`, `6 victims`).
2. Highlight the **Controller attribution** panel:
   - **"These 14 mule accounts are operated from 2 phones"** (`IMEI: 358911090000001`, `IMEI: 358911090000002`, shared `BSSID: AA:BB:CC:44:55:01`) with expandable 14-row device sighting evidence.
3. Expand **Time-aware money paths** (`TracesSummaryCard`) to show chronological LIBR money paths from `victim0_0@oksbi` through L1/L2 mules to cash-out vs residual recoverable balances (`₹2.8 L` still in mule accounts in `NET-7E008CEA`, `₹78.5 L` case-wide).
   - Screenshot: [04-network-14-mules-2-phones.png](file:///e:/new_tarka/tarka_v5/docs/demo/04-network-14-mules-2-phones.png)

### Minute 2:05 – 2:40 · Freeze Notices & Bank Reply Loop (`Actions & report`)
1. Navigate to **Actions & report** (`Step 6`). Point to the Freeze Value ranking queue (`Held ₹ × Retention Likelihood`).
2. Tick accounts, prepare per-bank freeze notices under **BNSS §106/§107**, and toggle **Per bank** grouping in **Notices sent to banks**.
3. Walk a notice through the live **Bank reply loop**: `Sent → Bank acknowledged → Frozen (₹) → Released (with order note)` alongside overdue SLA reminders and the **Network handover** panel.
   - Screenshot: [05-freeze-bank-reply-handover.png](file:///e:/new_tarka/tarka_v5/docs/demo/05-freeze-bank-reply-handover.png)

### Minute 2:40 – 3:00 · Hindi Court Report & Recoverable Summary (`Court report`)
1. Switch to the **Court report** tab, pick **Project** scope, and switch language to **हिन्दी**.
2. Scroll briefly to confirm:
   - Bilingual headers (`जाँच रिपोर्ट`, `पूरा प्रोजेक्ट`), time-aware money paths, controller attribution evidence (`14` accounts / `2` IMEIs), freeze status, SHA-256 artifact fingerprints, and per-section chained SHA-256 seal ready for **Export PDF**.
   - Closing line: *"Out of ₹13.4 L stolen in our flagship gang (and ₹1.3 Cr+ across 62 networks), TARKA pins ₹2.8 L in this gang (₹78.5 L case-wide) still sitting in mule accounts, attributes all 14 mules to 2 handsets, and produces the court-sealed Hindi/English report before the golden hour expires."*
   - Screenshot: [06-court-report-hindi.png](file:///e:/new_tarka/tarka_v5/docs/demo/06-court-report-hindi.png)
