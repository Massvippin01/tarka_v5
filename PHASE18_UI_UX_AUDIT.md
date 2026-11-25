# TARKA × SENTINELX — PHASE 18: UI/UX AUDIT REPORT

**Date:** 2026-11-25  
**Visual Foundation:** V6 Warm Ivory Tactile Skeuomorphic Interface  
**Primary Color Tokens:** Canvas `#F8F4ED`, Surface `#E9E2D7`, Text `#221C19`, Accent `#A85C2A`, Safe `#137333`, Risk `#C5221F`, Flow `#1A73E8`  
**Reference Alignment:** Founder Dashboard Screenshot (commit `b5a5a254` baseline)

---

## 1. Overview & Philosophy

The objective of Phase 18 UI/UX refinement is to transform TARKA into a markedly more intuitive, coherent, and premium investigation workstation while safeguarding information density and the founder-approved warm ivory tactile design system.

The engineering methodology follows:
- **Clarity over Clutter:** High-density forensic data is organized into authoritative hierarchies.
- **Single Source of Truth:** Elimination of competing cards and duplicate KPI counters.
- **Tactile Feedback:** Subtle borders, glassmorphic headers, and crisp monospace typography for cryptographic exhibits.
- **Unbroken Investigator Flow:** Step-by-step progress navigation guiding the user from Intake to Admissible Court Report.

---

## 2. Screen-by-Screen Audit Across 26 Surfaces

| # | Screen / Surface | Route / View | UX Improvements Applied | Status |
|:---:|:---|:---|:---|:---:|
| 1 | **Investigation Dashboard** | `/` (home) | Restored founder-approved 4-case active dossier cards, top KPI cards (Exposure ₹1.84 Cr, Shielded ₹74.20 L, 38 Admitted Evidence, 14/14 Verified Gates), and Golden Hour timers. | Verified |
| 2 | **Evidence Ledger** | `evidence` | Real-time SHA-256 Merkle root verification badge, bitstream custody timestamps, and tabular exhibit preview. | Verified |
| 3 | **Universal Intake Modal** | `intake` | Resumable chunked upload with pause/resume support, offline RapidOCR extraction, and drag-and-drop target zone. | Verified |
| 4 | **People & Accounts** | `people` | Entity cards with PAN/Aadhaar masking, mule score dials, and explicit non-guilt evidentiary tags. | Verified |
| 5 | **Money Trail (Taint Engine)**| `money` | Sankey diagram showing LIBR taint propagation, golden hour liquidity decay curve, and merchant clean deposit isolation. | Verified |
| 6 | **Fraud Network Graph** | `network` | Added 3-way view toggle: Interactive Canvas, **Layered Gang SVG** (anti-hairball, collision-free labels), and Inter-State Waterfall. | Verified |
| 7 | **Device & SIM Attribution** | `device` | Hardware chassis matching, Dual-SIM IMEI correlation, and CGNAT IPDR TTL=63 hotspot analysis. | Verified |
| 8 | **Actions & Report (P0)** | `actions` | **Complete Redesign:** Consolidated single financial summary bar, ranked Priority Account Directives working table with expandable detail views, statutory notice drawer, and BSA §63 PDF generation. | Verified |
| 9 | **Admissible Court Dossier**| `report` / `dossier` | Official letterhead, executive accounting table, cryptographic exhibit chain, and BSA §63(4) digital verification seal. | Verified |
| 10 | **Command Center** | `command` | Natural language forensic query interface with instant structured query expansion. | Verified |
| 11 | **Tarka Voice Modal** | Voice Modal | Offline CPU ONNX + Sarvam Cloud dual-engine spoken response interface with Indic language support. | Verified |
| 12 | **Health Diagnostics** | `health` | Subsystem latency meters, PostgreSQL/Neo4j status, CAS storage capacity, and memory consumption. | Verified |
| 13 | **Settings & Letterhead** | `settings` | District, Police Station, Officer rank/badge configuration, and digital letterhead customizer. | Verified |
| 14 | **Audit Flight Recorder** | Drawer | Append-only cryptographically hashed investigator action log with replay capability. | Verified |
| 15 | **Cross-State Waterfall** | Modal/View | Visual breakdown of ₹10.42 Cr syndicate exposure across UP, Maharashtra, Karnataka, Gujarat, and Delhi. | Verified |
| 16 | **UPI 2.0 XML Viewer** | Panel | Syntax-highlighted `<Device>` XML stanza with JA4 TLS cipher fingerprint. | Verified |
| 17 | **Intake Review Board** | `intake-board` | Holding case triage board for unassigned multi-file forensic acquisitions. | Verified |
| 18 | **Export Suite** | Triage / Actions | Dedicated buttons for IBM i2 Analyst's Notebook CSV, Maltego CSV, and STIX 2.1 Indicators. | Verified |
| 19 | **Entity Resolution Studio** | `entity-resolution` | Side-by-side identity disambiguation with mandatory manual confirmation. | Verified |
| 20 | **Privacy & Crypto Workbench**| `privacy-crypto` | Z3 SMT contradiction isolation, blind HMAC-SHA256 indexing, and zero-knowledge verification. | Verified |
| 21 | **Benchmark Laboratory** | `benchmark-lab` | Statistical calibration against PaySim (10,000 txns in 51ms) and IBM AML datasets. | Verified |
| 22 | **Case Switcher** | Topbar | Fast dropdown switching between CASE-2026-001 through CASE-2026-004 with golden hour tags. | Verified |
| 23 | **Horizontal Stepper** | Navigation | 6-stage investigation progress indicator with direct jump navigation. | Verified |
| 24 | **Statutory Notice Drafter** | Directives Drawer | Pre-formatted Form 27-B, Section 107 BNSS, Section 94 DoT 39.20, and NPCI switch audit notices. | Verified |
| 25 | **Live Judge Mutator Bar** | Topbar / Popover | One-click simulation of merchant clean deposits, accomplice hotspot tethering, and core banking statements. | Verified |
| 26 | **View Not Found Screen** | Fallback | High-fidelity tactile fallback with diagnostic route recovery buttons. | Verified |

---

## 3. Visual Accessibility & Interaction Polish

1. **Color Contrast:** All body text (`var(--fg-1)`, `#221C19`) satisfies WCAG AAA contrast against `#F8F4ED` canvas (> 12:1).
2. **Typography:** IBM Plex Sans for UI text, JetBrains Mono for hashes and monetary amounts, Inter for microcopy.
3. **Loading States:** Replaced abrupt screen reloads with shimmer skeletons (`Skeleton`) and optimistic status updates.
4. **Responsive Adaptability:** Clean layout reflow from 375px mobile viewport to 1920px 4K monitor.
