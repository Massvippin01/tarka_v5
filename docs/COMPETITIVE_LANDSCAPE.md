# TARKA vs existing systems: where we fit, what we do better, what is new

Research date: 18 Nov 2026. Figures are from public government releases and press; reporting periods differ, so check
PIB / Parliament answers before quoting a number on stage.

## 1. What exists today

| System | Who runs it | What it does | What it does *not* do |
|---|---|---|---|
| **1930 helpline + NCRP portal** | I4C / MHA | Citizens report fraud; the complaint is logged | No analysis; the complaint is a starting point only |
| **CFCFRMS** (since 2021) | I4C with banks | Routes each complaint to the victim's and beneficiary's banks so they hold the money; banks place a lien on the *disputed amount only* (2026 SOP), with a grievance module for account holders | Works on the first hop (the account that received the victim's money). It does not follow money that has already moved through layers 2, 3… or reconstruct the gang |
| **Suspect Registry** (Sep 2024) | I4C with banks | Shares suspect identifiers and **Layer-1** mule accounts with banks (about 27 lakh mule accounts shared, ₹9,500 Cr+ declined transactions, Jan 2026) | Layer-1 only; it is a list, not a network. It has no deeper layers, no cash-out points and no shared-device links |
| **Samanvaya** | I4C | Information system, data repository and coordination for police data sharing and analytics | Coordination and data, not case-level money reconstruction from raw statements |
| **Pratibimb** | Jharkhand CID + I4C | Maps the locations and infrastructure criminals use (phones, towers) | Where criminals are, not how the money moved |
| **MuleHunter.AI** | RBI Innovation Hub, inside banks | ML model on one bank's own transactions (19 mule patterns) to flag mule accounts; I4C–RBIH MoU (May 2026) feeds it Suspect Registry data | Bank-side and prevention-side. Each bank sees only its own customers, and the police investigator never sees the cross-bank picture |
| **i2 Analyst's Notebook, Maltego, Linkurious** | Commercial | Link-analysis charting for trained analysts | Generic. Officers must clean the data and build charts by hand. They carry no fraud-specific scoring, no money reconciliation and no freeze workflow, need expensive licences and training, and are not built for Indian bank, UPI and CDR formats |

**The gap:** the money leaves the first account within minutes (recovery is under 10% of losses, per a 2025 study).
Every system above acts on the first hop or on one bank's view. **No tool takes the raw statements from many banks
after a complaint, rebuilds the whole gang to the cash-out, and tells the investigating officer what to freeze next and
why, with evidence that holds up in court.** That is TARKA.

## 2. Where TARKA fits (complement, not compete)

```
Citizen ──1930/NCRP──▶ CFCFRMS (hold first hop) ──▶ Banks (MuleHunter.AI flags their mules)
                                   │
                                   ▼  police receive complaint + bank statements, CDR/IPDR
                        ┌─────────────────────────┐
                        │ TARKA (station/district)│  rebuild gang across banks → freeze plan → court bundle
                        └─────────────────────────┘
                                   │
          exports back: Suspect-Registry-ready deep-layer mule list, CFCFRMS-style lien amounts,
          case bundle for Samanvaya, i2/Maltego charts, STIX indicators for CERT-In
```

## 3. What TARKA does better (built today)

| Existing practice | TARKA | Status |
|---|---|---|
| Officer creates a case first, then adds evidence | **Files first, cases later:** drop all statements, TARKA proposes one case per gang and matches gangs to existing FIRs | Built |
| Layer-1 mules only (Registry, CFCFRMS) | **Every layer to the cash-out**: L1, L2, ATM and crypto exits, with hop distance from each victim | Built |
| One bank's view (MuleHunter) | **Cross-bank, cross-file**: the same mule in 3 banks' statements joins into one network | Built |
| Rule lists with high false positives | **Look-alike-aware scoring**: salary-then-rent and shared-ATM patterns are planted in tests; 252/252 planted mules found, 0 innocent flagged (synthetic) | Built |
| Manual charts (i2) | Automatic networks, 1M rows in ~8 s on a laptop, offline | Built |
| Whole-account freezes cause grievances | Freeze amounts per account = money traced to the victim (LIBR / FIFO / pro-rata compared), matching the 2026 "disputed amount only" SOP | Built |
| Numbers hard to defend in court | **Every rupee opens its source rows**, sealed with a hash chain; totals always reconcile | Built |
| Overlapping statements double-counted | Each transaction counted once, across files | Built |

## 4. New things to add, ranked (impact for officers × novelty × feasibility)

| # | Feature | Why it is new | Effort |
|---|---|---|---|
| 1 | **Deep-layer Suspect Registry feed**: export L2+ mules and cash-out points in a Registry-ready file | The Registry holds Layer-1 only; TARKA supplies the layers it lacks | 1 day |
| 2 | **Freeze race clock**: money still reachable vs this gang's measured cash-out speed, with "notify bank X in 9 min" | Turns the golden hour into a per-gang deadline | 2–3 days |
| 3 | **Disputed-amount lien letters**: per account, the traced amount only, in the CFCFRMS / SOP style | Fewer innocent-account grievances, faster bank action | 1–2 days |
| 4 | **NCRP complaint auto-match**: each complaint is matched to the gang that took the money | Starts where officers start | 3 days |
| 5 | **Mule passport**: an identifier's history across all cases and districts, plus a behaviour fingerprint | Cross-case memory beyond account numbers | 2 days |
| 6 | **"Why not innocent?" explainer** for every flag | Answers the main legal objection before it is raised | 1–2 days |
| 7 | **Accuracy certificate** on every report (planted-gang test result for this release) | Measurable trust; rare in government software | 1 day |
| 8 | **Bank-side handoff**: accept MuleHunter / bank FRM flags as an input and confirm or refute them with the cross-bank network | Joins the bank and police sides | 2 days |

## 5. Integration: adapts to any existing system

1. **Teach-once importer**: any CSV / Excel / JSON / XML export; map the columns once and it is saved as a template.
   Ship templates for NCRP complaints, CCTNS FIRs and the major bank and telecom formats.
2. **Plug-in adapters**: one small read/write file per system, dropped into a folder.
3. **Open, versioned API with per-agency keys**, and **signed webhooks** (`network.found`, `freeze.status_changed`).
4. **Exports in formats existing tools already import**: case bundle JSON (versioned schema), i2 / Maltego CSV,
   STIX 2.1 indicators, a Suspect-Registry-ready CSV, and a PDF court bundle.
5. **Drop-in deployment**: one offline image beside existing systems; it reads their exports and never needs write
   access to them.

Interfaces of CFCFRMS, NCRP, CCTNS, Samanvaya and the Suspect Registry are not public in detail. Build to their
documented fields and open formats, and adapt when an agency shares its specification.

## 6. Pitch lines

- "Every system today stops at the first account. TARKA follows the money to the cash-out."
- "Banks see their own customers. The officer sees the whole gang, across every bank, in seconds."
- "Every rupee on screen opens the bank row it came from."
- "TARKA does not replace CCTNS, NCRP or CFCFRMS. It reads their exports and hands results back in their formats."

## Sources

- [PIB press release on I4C / CFCFRMS](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2241344&reg=48&lang=2)
- [MHA Rajya Sabha answer, Feb 2026](https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1338.pdf)
- [IMPRI: CFCFRMS explainer](https://www.impriindia.com/insights/policy-update/citizen-financial-cyber-fraud-reporting-and-management-system-cfcfrms-strengthening-indias-response-to-digital-financial-fraud/)
- [IMPRI: I4C overview](https://www.impriindia.com/centres/center-for-ict-for-development/indian-cyber-crime-coordination-centre-i4c-strengthening-indias-response-to-cyber-fraud/)
- [SOP for NCRP-CFCFRMS (2026)](https://cdnbbsr.s3waas.gov.in/s3ec03936824c0191953647ec609b4f49b/uploads/2026/06/2026061955.pdf)
- [Lien marking explainer (befisc)](https://www.befisc.com/fintechsherlock/lien-marking-bank-account-cyber-fraud/)
- [I4C (Wikipedia)](https://en.wikipedia.org/wiki/Indian_Cyber_Crime_Coordination_Centre)
- [Business Standard: MuleHunter.AI explained](https://www.business-standard.com/finance/personal-finance/explained-rbi-has-a-new-ai-tool-mulehunter-ai-to-reduce-digital-frauds-124120900250_1.html)
- [RBIH: MuleHunter.AI](https://rbihub.in/?p=17343)
- [Telangana Today: I4C–RBIH MoU, May 2026](https://telanganatoday.com/i4c-and-rbih-sign-mou-to-tackle-cyber-fraud-and-mule-accounts)
- [ThePrint: Suspect Registry results](https://theprint.in/india/special-i4c-registry-led-to-blocking-of-rs-8031-cr-cyber-fraud-funds-govt/2802007)
- [i2 Group: link analysis](https://i2group.com/solutions/link-analysis-software)
- [NFSU journal: digital arrest and cyber-forensics gaps](https://jfj.nfsu.ac.in/Uploads/EJournal/4/7/(80-89)%20NAVIGATING%20DIGITAL%20ARREST%20UNDER%20INDIA%E2%80%99S%20CYBER-FORENSICS%20FRAMEWORK%20COMPLEXITIES,%20LEGAL%20GAPS,%20AND%20PATHWAYS%20FORWARD.pdf)
