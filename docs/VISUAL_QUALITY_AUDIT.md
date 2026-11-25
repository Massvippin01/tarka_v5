# TARKA × SENTINELX — VISUAL QUALITY AUDIT

**Date:** 2026-11-26  
**Subject:** V6 Tactile Skeuomorphic Layout, Visual Hierarchy & Component Integrity  
**Approved Baseline Reference:** Attached Founder Dashboard Reference (`media_1795607067597_c652bba7.jpg`)  

---

## 1. Design System Fidelity Audit

The visual design of TARKA is governed by the V6 warm ivory and linen tactile skeuomorphic aesthetic:
- **Surface Palette:**
  - Base Background: Warm Cream Ivory (`#F5EFEB`, `#F8F4ED`)
  - Elevated Cards: Pure White Linen (`#FFFFFF`) with subtle 1px border (`#E6DDD2` / `#D5CABE`) and 2px soft ambient drop-shadow.
  - Sidebar Rail: Rich Espresso Charcoal (`#1F1A17` / `#2B2420`) with warm amber accents.
- **Typography:**
  - Headers: Clean, authoritative Sans-Serif (`Inter`, `Plus Jakarta Sans`, `IBM Plex Sans`).
  - Monospace Financial / Hash Tokens: `JetBrains Mono`, `IBM Plex Mono` with tabular numerals.
  - Indian Currency Format: Strictly `₹` prefixed in `en-IN` numbering (`₹1,84,00,000.00`).

---

## 2. 26-Screen Visual Inventory & Layout Check

| Screen # | Screen Name | Route / View | Skeuomorphic Tokens | Brand Integration | Status |
|----------|-------------|--------------|----------------------|-------------------|--------|
| **00** | Autonomous Particle Home | `home` | Warm orb, frequency visualizer | V6 Rail Logo | **VERIFIED** |
| **01** | Executive Command Center | `command` | 4 Dossier cards, golden hour HUD | V6 Rail Logo | **VERIFIED** |
| **02** | Fraud Network Topology | `network` | Force-directed nodes, mule ring tags | Shell Logo | **VERIFIED** |
| **03** | Evidence Ledger & Intake | `intake` | Bitstream hash pill, drag-drop zone | Shell Logo | **VERIFIED** |
| **04** | Case Workspace | `cases` | Stage progression, timeline cards | Rail & Shell Logo | **VERIFIED** |
| **05** | Entity Resolution & Veto | `resolution` | Discrepancy comparison side-by-side | Rail Logo | **VERIFIED** |
| **06** | Money Trail & UPI Flow | `money-trail` | Waterfall flow, RRN reconciliation | Rail Logo | **VERIFIED** |
| **07** | Taint Engine & Mule Scoring | `taint` | Mule risk gauge, hops visualization | Rail Logo | **VERIFIED** |
| **08** | People & Mules Directory | `people` | KYC card stack, phone attribution | Rail Logo | **VERIFIED** |
| **09** | Device & SIM Swap Intel | `device-sim` | IMEI/IMSI pairing timeline | Rail Logo | **VERIFIED** |
| **10** | Attribution & Syndicate | `attribution` | Syndicate dossier, jurisdictional lien | Rail Logo | **VERIFIED** |
| **11** | Cross-State Waterfall | `waterfall` | Interstate bank transaction graph | Rail Logo | **VERIFIED** |
| **12** | Statutory Actions & Court Report | `report` | Section 106 BNSS & Section 63 BSA | Rail & PDF Logo | **VERIFIED** |
| **13** | Benchmark Lab (10k-50k rows) | `benchmark` | Live worker throughput counters | Rail Logo | **VERIFIED** |
| **14** | Health Diagnostics & F-8 | `diagnostics` | System telemetry, DB/CAS probes | Rail Logo | **VERIFIED** |
| **15** | Cross-Case Comparator | `comparator` | Multi-case graph correlation | Drawer Logo | **VERIFIED** |
| **16** | Privacy & Cryptographic Bench | `crypto` | Zero-knowledge hashing audit | Rail Logo | **VERIFIED** |
| **17** | Massive Evidence Intake Modal | `modal-intake`| Tus resumable chunked upload UI | Modal Header | **VERIFIED** |
| **18** | Judge Mode Walkthrough | `demo-judge` | Evidence admissibility inspection | Modal Header | **VERIFIED** |
| **19** | Multilingual Voice Copilot | `assistant` | Sarvam cloud modal, 11 languages | Copilot Avatar | **VERIFIED** |
| **20** | New Case Intake Modal | `new-case` | FIR registration wizard | Modal Header | **VERIFIED** |
| **21** | Bulk Ingestion Progress Modal | `bulk-modal` | Web worker live SHA-256 HUD | Progress Card | **VERIFIED** |
| **22** | Audit Trail Drawer | `audit` | Append-only flight recorder ledger | Drawer Header | **VERIFIED** |
| **23** | Public Dataset Benchmark Modal | `dataset-modal`| PaySim & synthetic corpus streaming | Modal Header | **VERIFIED** |
| **24** | Settings & Profile Modal | `settings` | Officer persona selector, dark mode | Modal Header | **VERIFIED** |
| **25** | Relationship Evidence Sheet | `evidence-sheet`| Micro-exhibit viewer with SHA-256 | Sheet Header | **VERIFIED** |

---

## 3. Visual Quality Conclusions

1. **Zero Layout Distortion:** No overflow clipping, misaligned flex containers, or overlapping badges.
2. **Responsive Shell:** The V6Rail smoothly transitions between collapsed (22px icon mark) and expanded (22px full serif wordmark + mark) states.
3. **Contrast Compliance:** All text conforms to WCAG AA contrast standards (> 4.5:1 ratio) on warm ivory and linen cards.
