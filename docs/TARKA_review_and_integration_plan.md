# TARKA — honest review, novelty ideas and integration plan (18 Nov 2026)

Scores are 0–10. "Evidence" says what each score rests on. Pages I did not open myself are scored from the
hand-over notes of the sessions that rebuilt them, and are marked *(notes)*.

## 1. Verdict

**Overall: 6.5 / 10 as a competition entry, 4 / 10 as something a police station could install tomorrow.**

TARKA is strongest where it is real: it parses actual bank, UPI, CDR and WhatsApp exports. It finds mule networks in
1M-row files in seconds, and it ties every number back to source rows. It is weakest where the demo era left
invented content behind (fixed figures, a hard-wired demo case, simulated cryptography). It also does not yet show
how it fits next to the systems police already use. That gap is exactly the judges' point.

| Area | Score | Evidence |
|---|---|---|
| Fit to the problem statement | 8 | All five deliverables exist: attribution, entity resolution, money correlation, network view, reports (see §2). |
| Real data pipeline | 8 | Real parsers in `backend/tarka/parsers/`; 1M rows parse and load in 7.2 s (about 1,38,000 rows/s); planted-gang validation scores 1.0/1.0 (synthetic). |
| Case pages (6) | 7.5 | Rebuilt 17–18 Nov with source rows behind every figure and case isolation enforced *(notes)*. |
| Advanced pages (4) | 7 | Rebuilt today; invented figures removed; Privacy demoted to a Labs prototype. |
| Backend robustness | 5 | 28 routers, 236 endpoints, 83 test files. A lot of demo code still sits in production routes (§4). |
| Integration readiness | 3 | OpenAPI exists by default and so do 11 adapter "families", but there is no import/export contract, webhooks, SSO or standard export formats. |
| Novelty vs existing government tools | 6 | Planted-gang accuracy check, look-alike-aware mule scoring, freeze race clock and source-row provenance are unusual. The rest overlaps with existing I4C tooling. |

## 2. Fit to the problem statement

| Deliverable | Where it lives | Status |
|---|---|---|
| Fraud attribution engine | Mule scoring (`mule_scoring_service.py`), Devices & SIMs (shared IMEI / Wi-Fi / IP) | Real; explainable scores |
| Entity resolution | People & accounts, `case_entity_resolution_service.py` | Real for accounts/UPI; person-level merging is thin |
| Financial evidence correlation dashboard | Money trail, Station overview | Real, reconciles to booked loss |
| Fraud-network visualisation | Network page (WebGL), Triage | Real |
| Investigative reports | Actions & report (freeze notices, A4 report, hash chain) | Real; PDF goes through the browser print dialog |

**Is it really useful?** Yes, for the 1930 workflow of complaint → trace money → freeze → identify mules → court. The
part officers will value most is the freeze queue ranked by money still in reach. The part they will value least is
anything that looks like a demo (voice orb, cryptography lab) unless it saves them clicks.

## 3. Page ratings

| Page | Score | One-line verdict |
|---|---|---|
| Evidence *(notes)* | 7.5 | Ledger with rails and reject reasons; good. |
| People & accounts *(notes)* | 7 | Useful; person merging needs more signals (PAN, phone, address). |
| Money trail *(notes)* | 8 | The core page; reconciles; "freeze these first" is the killer feature. |
| Network *(notes)* | 7.5 | WebGL scale is impressive; needs a "why are these linked" panel on every edge. |
| Devices & SIMs *(notes)* | 7.5 | Strong-vs-weak identifiers explained; uploaded login logs supported. |
| Actions & report *(notes)* | 8 | Freeze notices with status and overdue flags close the loop. |
| Voice assistant | 6 | Clean now, but voice adds little over typing at a desk. The voice window still shows an invented model list and a fake "100% … Verified" line. |
| Case timeline | 7.5 | New: shows the golden-hour and cash-out gaps per case. Short, honest, useful in a briefing. |
| Scale check | 7 | Shows only measured runs (synthetic, labelled). Good for judges; officers rarely need it. |
| Private bank match (Labs) | 3 | Honest prototype; not wired to anything. Keep hidden. |

## 4. Backend: what is not yet right

1. **Demo code in live routes.** `investigation.py` defaults to case `C102`, returns a hard-coded person "Vikram Singh"
   and a fixed `er_match_rate`. `BenchmarkService` benchmarks fixed IDs. These should be deleted or moved behind a
   `/demo` prefix.
2. **Demo auth fallback.** With `ENABLE_DEMO_AUTH` in development, a missing token becomes a supervisor login. This is
   fine locally but must be impossible in a deployed build: add a startup check that refuses to start if
   `APP_ENV != development` and demo auth is on.
3. **Backend suite today: 1,266 passed, 14 failed, 6 skipped** (local, no Postgres/Neo4j). 12 failures are
   "connection refused" (case lifecycle, audit feed, freeze notices, system settings, action loop): mark them
   `integration` so a red default run means a real bug. **2 are real findings:**
   - `test_massive_evidence_ingestion_and_admission::test_03`: a 500 GB file is now *admitted immediately* instead of
     being queued or refused. Admission control no longer protects the machine.
   - `test_tarka_offline_voice_restoration::test_07`: the offline speech-model inventory check fails (models missing or
     the inventory changed).
4. **In-process singletons** (`get_instance()` everywhere). One worker only; state is lost on restart. That is acceptable
   for a single station; it needs a job queue and a DB-backed store before district-level use.
5. **Long work runs inside requests** (Scale check, some analyses). Move it to the ingestion job runner, which already
   has resumable jobs.
6. **Large-evidence engine stages 6–9 are stubs** (project notes). Either finish them or remove them from the UI flow.

## 5. Novelty ideas, scored

Scoring: Impact on officers (I), Feasibility in about 2 weeks (F), Novelty vs existing tools (N), Demo strength (D),
each 1–5. Total out of 20.

| # | Idea | I | F | N | D | Total |
|---|---|---|---|---|---|---|
| 1 | **Freeze race clock per network**: money still in reach vs this gang's measured cash-out speed, from the case timeline gaps. Tells the officer which letter to send in the next 10 minutes. | 5 | 4 | 4 | 5 | **18** |
| 2 | **Bank reply reader**: ingest banks' freeze-confirmation emails/CSVs and update notice status automatically. Closes the loop that is manual today. | 5 | 3 | 4 | 4 | **16** |
| 3 | **Cross-case mule memory**: "this IMEI / UPI ID / Wi-Fi was seen in 7 other complaints in this district", with behaviour fingerprints, not just account numbers. | 5 | 3 | 4 | 5 | **17** |
| 4 | **Accuracy certificate per release**: Scale check run on every build, attached to reports ("this version found 100% of planted mules in a 1M-row test"). Rare in government software. | 3 | 5 | 5 | 4 | **17** |
| 5 | **Look-alike explainer**: for every flagged account, show the innocent pattern it was checked against (salary-and-rent, shared ATM) and why it is still suspicious. Defends against "you froze an innocent person". | 4 | 4 | 4 | 4 | **16** |
| 6 | **Court bundle in one click**: report + source rows + hash chain + Section 63 certificate draft, as a sealed ZIP. | 4 | 4 | 3 | 4 | 15 |
| 7 | Offline voice in Indian languages for field officers | 3 | 3 | 3 | 4 | 13 |
| 8 | Private matching between banks (PSI) | 4 | 1 | 5 | 3 | 13 |

Recommendation: build **1, 3 and 4** next. They reuse what exists (timeline gaps, networks, scale runs) and answer
"what is new here?" in one sentence each.

## 6. Integration plan: "TARKA plugs into what you already use"

The judges' concern is that government already runs proprietary software. TARKA should not compete with those
systems. It should be the **analysis layer that reads from them and writes back to them**. Exact interfaces of
government systems (CFCFRMS for 1930 freezes, NCRP, CCTNS, I4C's Samanvaya / suspect registry) must be confirmed with
the agency. Until then, build to open formats they can import.

| # | Step | What it gives | Effort | Value | Score /10 |
|---|---|---|---|---|---|
| 1 | **Stable, documented API**: freeze `/api/v1` as a contract, publish the OpenAPI file, and issue per-agency API keys (`core/security.generate_api_key` exists) with scopes. | Any vendor can call TARKA | S | High | **9** |
| 2 | **Case bundle schema**: version the `/cases/{id}/bundle` JSON as a published JSON Schema; import and export it. | One file moves a whole case between systems | S | High | **9** |
| 3 | **Standard exports**: CSV for i2 Analyst's Notebook / Maltego entity-link import, STIX 2.1 for indicators (UPI IDs, phones, IMEIs, IPs, URLs) to share with CERT-In and I4C, Excel for everyone. | Works with tools officers already have | M | High | **8** |
| 4 | **Import adapters for official exports**: NCRP complaint export, bank statement formats (already), telecom CDR/IPDR (already), CCTNS FIR (adapter stub exists in `adapters/families/cctns_adapter.py`). | No retyping | M | High | **8** |
| 5 | **Webhooks / events**: `case.updated`, `network.found`, `freeze_notice.status_changed`, signed with HMAC. | Other systems react without polling | S | Medium | **7** |
| 6 | **Single sign-on**: OIDC/SAML against the state police directory; map roles to TARKA roles. | No new passwords; audit by real identity | M | High | **7** |
| 7 | **Headless + air-gapped deployment**: one Docker image, no internet calls, SQLite for a station or Postgres for a district. | Fits closed government networks | M | High | **8** |
| 8 | **Provenance in an open standard**: export the evidence chain as CASE/UCO (cyber-investigation provenance ontology). | Court and forensic labs can verify independently | M | Medium | 6 |

**Order:** 1 → 2 → 3 → 5 (about 1 week, all small and mostly existing code), then 7 → 4 → 6. Each step ships with a
contract test so the integration cannot silently break.

**Pitch line for judges:** *"TARKA does not replace CCTNS, NCRP or your bank portals. It reads their exports, finds
the network in seconds, shows the source row behind every rupee, and hands the result back in formats your existing
tools already import."*

## 7. What this review did not check

- Pages marked *(notes)* were not re-opened today.
- No load test with several officers at once.
- Interfaces of CFCFRMS, NCRP, CCTNS and Samanvaya are not public in detail; the integration steps target open
  formats until the agency confirms its interfaces.
- Backend suite run locally without Postgres/Neo4j (results in §4 point 3); the 12 connection failures were not re-run against a database.
