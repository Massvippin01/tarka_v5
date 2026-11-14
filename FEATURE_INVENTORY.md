# TARKA Feature Inventory & Parity Matrix (v6 Parity Contract)

> **Golden Rule**: Adapt, Never Drop. Every feature from the legacy presentation layer (`?legacy=1`) is preserved, connected, and elevated to the v6 obsidian glass design system.

---

## 1. Executive Summary
This document provides the authoritative inventory of all legacy capabilities, screens, tabs, modals, drawers, and tools across TARKA, mapping them to their adapted v6 implementations.

| Category | Total Features | Adapted in v6 | Status |
| :--- | :---: | :---: | :---: |
| **Core Investigation Pipeline** | 8 screens | 8 screens | **100% PARITY** |
| **Forensic Labs & Benchmarks** | 4 sub-systems | 4 sub-systems | **ADAPTING** |
| **AI Copilot & Multimodal Voice** | 2 engines | 2 engines | **ADAPTING** |
| **Overlays, Modals & Drawers** | 12 components | 12 components | **ADAPTING** |
| **Mutator & Proof Systems** | 3 mutators | 3 mutators | **100% PARITY** |

---

## 2. Component Inventory (19 Parity Targets)

| # | Component Name | Legacy Source Path | v6 Target / Adaptation Point | Status |
|---|----------------|-------------------|-----------------------------|--------|
| 1 | **TarkaCommandPalette** | `src/components/tarka/TarkaCommandPalette.tsx` | `src/components/tarka/TarkaCommandPalette.tsx` (restyled to v6 tokens, synced to `useCaseStore`) | **ADAPTING** |
| 2 | **ForensicAssistantPanel** | `src/components/tarka/ForensicAssistantPanel.tsx` | Slide-over AI Copilot drawer in `V6AppShell`, triggered by Topbar "Ask TARKA" & Cmd-K | **ADAPTING** |
| 3 | **SarvamVoiceModal** | `src/components/tarka/SarvamVoiceModal.tsx` | Voice mode within Ask TARKA / standalone multimodal voice modal | **ADAPTING** |
| 4 | **InvestigationIntelligenceBrief** | `src/components/tarka/investigation/InvestigationIntelligenceBrief.tsx` | Topbar / Palette triggerable 7-question statutory brief modal with citations | **ADAPTING** |
| 5 | **JudgeModeWalkthrough** | `src/components/tarka/demo/JudgeModeWalkthrough.tsx` | Guided 6-stage offline judge walkthrough overlay | **ADAPTING** |
| 6 | **EvidenceIntakeModal** | `src/components/tarka/EvidenceIntakeModal.tsx` | Evidence upload modal with WebCrypto SHA-256 and pipeline progress | **ADAPTING** |
| 7 | **NewCaseModal** | `src/components/tarka/workspace/NewCaseModal.tsx` | Accessible via Topbar "+ New Case" & Command Palette | **ADAPTING** |
| 8 | **BulkIngestionModal** | `src/components/tarka/workspace/BulkIngestionModal.tsx` | Bulk / ZIP evidence ingestion worker modal | **ADAPTING** |
| 9 | **PublicDatasetBenchmarkModal** | `src/components/tarka/benchmark/PublicDatasetBenchmarkModal.tsx` | Benchmark Lab tab & palette action (Alt+D) | **ADAPTING** |
| 10 | **BenchmarkLabDrawer** | `src/components/tarka/benchmark/BenchmarkLabDrawer.tsx` | Benchmark Lab calibration drawer (Alt+B) | **ADAPTING** |
| 11 | **RelationshipEvidenceSheet** | `src/components/tarka/investigation/RelationshipEvidenceSheet.tsx` | Entity graph & people inspector relationship deep-dive | **ADAPTING** |
| 12 | **TransformationAuditLog** | `src/components/tarka/investigation/TransformationAuditLog.tsx` | Evidence ledger & audit inspection drawer | **ADAPTING** |
| 13 | **CaseAuditTrailDrawer** | `src/components/tarka/audit/CaseAuditTrailDrawer.tsx` | Topbar notification popover "Audit Trail" & case menu | **ADAPTING** |
| 14 | **CaseStatusControl** | `src/components/tarka/cases/CaseStatusControl.tsx` | Topbar case status chip dropdown & case actions | **ADAPTING** |
| 15 | **WhatChangedBanner** | `src/components/tarka/common/WhatChangedBanner.tsx` | Mutation & tamper delta banner when mutations are active | **ADAPTING** |
| 16 | **ForensicReportModal** | `src/components/tarka/ForensicReportModal.tsx` | ActionsReportScreen report exporter / PDF print viewer | **ADAPTING** |
| 17 | **PrivacyCryptoWorkbench** | `src/components/tarka/privacy/PrivacyCryptoWorkbench.tsx` | LabScreen Tab 2: "Privacy & ZKP" (`view=privacy-crypto`) | **ADAPTING** |
| 18 | **ForensicWorkstationScreen** | `src/pages/v5/ForensicWorkstationScreen.tsx` | LabScreen Tab 3: "Forensic Workstation" (`view=workstation`) | **ADAPTING** |
| 19 | **BenchmarkLabScreen** | `src/pages/v5/BenchmarkLabScreen.tsx` | LabScreen Tab 4: "Benchmark Lab" (`view=benchmarks`) | **ADAPTING** |
| 20 | **GlossaryTerm** | `src/components/tarka/kit/GlossaryTerm.tsx` | Tooltip & legal acronym explanation wrapper throughout v6 | **ADAPTING** |

---

## 3. Keyboard Shortcuts Contract
- **Cmd/Ctrl + K**: Open TARKA Global Forensic Command Palette
- **1 .. 6**: Direct jump to investigation stages (1: Evidence, 2: People, 3: Money, 4: Network, 5: Device, 6: Actions)
- **F**: Quick jump to Actions & Freeze Accounts
- **A**: Toggle Ask TARKA AI Copilot & Voice Drawer
- **Alt + B**: Open Forensic Benchmark & Calibration Lab
- **Alt + D**: Open Public Dataset Benchmark Modal
- **Esc**: Close any active drawer, sheet, or modal
