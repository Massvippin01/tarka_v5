# TARKA SUTRAM 2026 PS04: COMPONENT INVENTORY & ARCHITECTURAL REGISTRY
## Phase 3 Reusable Component Foundation

**Document Version:** 1.0.0-PS04-COMP-INV  
**Date:** November 4, 2026  
**Status:** IMPLEMENTED & AUDITED  
**Author:** Staff UI/UX & Forensic Systems Architect (Member B Workstream)  
**Target Competition:** SUTRAM 2026 — Problem Statement PS04 (*AI-Powered Cyber Fraud Investigation & Attribution System*)  
**Repository Branch:** `feat/sutram-2026-ps04-member-b`  
**Working Directory:** `C:\PROJECTS\tarka_v5`  

---

# 1. COMPONENT TAXONOMY & DIRECTORY STRUCTURE

The TARKA frontend component library is structured into six functional tiers under `frontend/src/`:
1. `components/shell/`: Global application shell, navigation rail, operational timeline stepper.
2. `components/tarka/kit/`: Foundational forensic UI primitives (calipers, provenance pills, state notices).
3. `components/tarka/`: Specialized domain widgets (command palette, modals, report drawers).
4. `components/tarka/{intake, attribution, network, taint, privacy, benchmark, workspace}/`: Sector-specific sub-assemblies.
5. `pages/v5/`: Top-level page screens rendering the 10 Information Architecture sectors.
6. `components/ui/`: Low-level graphics primitives and animated infographic counters.

---

# 2. DEFINITIVE COMPONENT INVENTORY MATRIX

| Component Name | Source Code Path | Category | Primary Props & Interfaces | Key Dependencies | Forensic Functionality |
|:---|:---|:---|:---|:---|:---|
| **`TarkaGlobalShell`** | [`src/components/shell/TarkaGlobalShell.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/shell/TarkaGlobalShell.tsx) | Shell / App Chrome | None (Global Context Consumer) | Radix Popover, Lucide, `useTarkaGlobal`, `useTarkaUiStore` | Renders 56px/232px collapsible nav rail, active case breadcrumb, air-gap indicator, Golden Hour SLA countdown. |
| **`CaseWorkspaceScreen`**| [`src/pages/v5/CaseWorkspaceScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/CaseWorkspaceScreen.tsx) | Sector 1 Screen | None (Context Consumer) | Radix Dialog, `BentoPrimitives`, WebCrypto API | Multi-case triage, priority filtering, Golden Hour countdown, WebCrypto client-side SHA-256 evidence dropzone. |
| **`IntakeScreen`** | [`src/pages/v5/IntakeScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/IntakeScreen.tsx) | Sector 3 Screen | None (Context Consumer) | `react-resizable-panels`, `intakeFalsifier.ts`, `GateRail` | Double-entry balance conservation audit, 12-digit RRN Julian date validator, PDF `%%EOF` Canva tamper scanner. |
| **`EntityResolutionScreen`**| [`src/pages/v5/EntityResolutionScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/EntityResolutionScreen.tsx) | Sector 4 Screen | None (Context Consumer) | `SectionCard`, `KpiTile`, `StoryBanner` | Bipartite mapping 24 raw tokens $\rightarrow$ 5 entities, Hard-Veto Guardrail protecting Apex Electronics. |
| **`AttributionScreen`** | [`src/pages/v5/AttributionScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/AttributionScreen.tsx) | Sector 7 Screen | None (Context Consumer) | `SignalSieveCanvas`, `cgnatAttribution.ts`, Lucide | 340-to-1 CGNAT funnel ($P=1.4\times 10^{-7}$), dual-SIM TAC hardware twin, Z3 SMT clock proof caliper. |
| **`FraudNetworkScreen`** | [`src/pages/v5/FraudNetworkScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/FraudNetworkScreen.tsx) | Sector 5 Screen | None (Context Consumer) | D3 / SVG Force Layout, `graphProjectionAdapter.ts` | Dynamic SVG actor graph, Wi-Fi hotspot AP tethering ($TTL=63$), JA4 TLS client fingerprinting, NPCI `<Device>` XML. |
| **`TaintEngineScreen`** | [`src/pages/v5/TaintEngineScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/TaintEngineScreen.tsx) | Sector 6 Screen | None (Context Consumer) | `d3-sankey`, `recoveryModel.ts`, `SectionCard` | D3-Sankey money trail, Dinic Min-Cut ($K=3$), LIBR vs FIFO comparison, Section 106/107 BNSS freeze notice export. |
| **`CourtProofScreen`** | [`src/pages/v5/CourtProofScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/CourtProofScreen.tsx) | Sector 9 Screen | None (Context Consumer) | `courtProofEngine.ts`, `statutoryDirectives.ts` | BSA Section 63(4) Part A & B certificates, Leave-One-Out adversarial stress tester, BIP-39 phonetic paper seal. |
| **`PrivacyCryptoWorkbench`**| [`src/components/tarka/privacy/PrivacyCryptoWorkbench.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/privacy/PrivacyCryptoWorkbench.tsx) | Sector 8 Screen | None (Context Consumer) | `forensicCrypto.ts`, WebCrypto API, Radix Tabs | Tripartite SECP256k1 ECDH-PSI, Groth16 / BN254 ZKP threshold verifier, 4-node PBFT consensus, Formal Claim DAG. |
| **`BenchmarkLabScreen`** | [`src/pages/v5/BenchmarkLabScreen.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/pages/v5/BenchmarkLabScreen.tsx) | Sector 10 Screen | None (Context Consumer) | Web Workers (`forensicBenchmark.worker.ts`) | $356\text{k rows/s}$ streaming engine, constant $38.2\text{ MB}$ RAM ceiling, 27-check matrix, 100k PaySim ground truth. |
| **`ForensicStateNotice`** | [`src/components/tarka/kit/ForensicStateNotice.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/kit/ForensicStateNotice.tsx) | Kit Primitive | `type`, `title`, `description`, `statutoryRef`, `onAction` | Lucide Icons, CSS Tokens | Accessible empty, loading, error, and permission-denied indicators. |
| **`EvidenceProvenancePill`**| [`src/components/tarka/kit/EvidenceProvenancePill.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/kit/EvidenceProvenancePill.tsx) | Kit Primitive | `artifactName`, `tier`, `sha256`, `recordRef`, `onInspect` | Lucide Icons, Clipboard API | Truncated SHA-256 exhibit reference with 1-click clipboard copy and byte inspector trigger. |
| **`FinancialAmountDisplay`**| [`src/components/tarka/kit/FinancialAmountDisplay.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/kit/FinancialAmountDisplay.tsx) | Kit Primitive | `amountRupees`, `accountingModel`, `isTainted`, `taintRatio` | `Intl.NumberFormat`, Tabular Numerics | Tabular monospace Indian Rupee formatter with LIBR/FIFO designation and safe-harbor badge. |
| **`TimestampDisplay`** | [`src/components/tarka/kit/TimestampDisplay.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/kit/TimestampDisplay.tsx) | Kit Primitive | `isoTimestamp`, `clockDriftSeconds`, `showDualTimezone` | `Intl.DateTimeFormat`, Lucide Clock | Dual-timezone forensic clock (IST / UTC toggle) with Stratum-2 NTP clock-drift caliper offsets. |
| **`ContradictionIndicator`**| [`src/components/tarka/kit/ContradictionIndicator.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/kit/ContradictionIndicator.tsx) | Kit Primitive | `findingTitle`, `sourceA`, `sourceB`, `discrepancyDelta` | Lucide Scale, CSS Tokens | Visual diff presenting Source A vs Source B and demanding explicit human decision. |
| **`BentoKpiCard`** | [`src/components/tarka/BentoPrimitives.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/BentoPrimitives.tsx) | Bento Primitive | `title`, `metric`, `delta`, `statusBadge`, `icon`, `meta` | Lucide, `AnimatedCounter` | Compact 96px executive summary tile with hero numbers, sparklines, and status chips. |
| **`TarkaCommandPalette`** | [`src/components/tarka/TarkaCommandPalette.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/TarkaCommandPalette.tsx) | Command Surface | None (Context Consumer) | `cmdk`, Lucide, `useTarkaGlobal` | Global `Cmd+K` forensic command bar for keyboard-driven case navigation and action execution. |
| **`SignalSieveCanvas`** | [`src/components/tarka/attribution/SignalSieveCanvas.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/attribution/SignalSieveCanvas.tsx) | Caliper Canvas | `funnelStages`, `activeCandidateCount`, `onCaliperChange` | HTML5 Canvas / SVG, `d3-scale` | Interactive 4-stage funnel visualization isolating physical subscriber handset from CGNAT pool. |
| **`EndToEndReconstructionStrip`**| [`src/components/tarka/investigation/EndToEndReconstructionStrip.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/investigation/EndToEndReconstructionStrip.tsx) | Investigation Strip | `investigation`, `onStepClick` | Lucide Icons, CSS Tokens | 5-file evidentiary join progress strip showing live verification status across all 6 forensic engines. |
| **`TransformationAuditLog`**| [`src/components/tarka/investigation/TransformationAuditLog.tsx`](file:///c:/PROJECTS/tarka_v5/frontend/src/components/tarka/investigation/TransformationAuditLog.tsx) | Audit Drawer | `isOpen`, `onClose` | Radix Dialog, `tokens.css` | 10-step cryptographic transformation audit log tracking evidence from raw acquisition to court dossier. |

---
*Authored: Staff UI/UX & Forensic Systems Architect (Member B Workstream)*  
*TARKA SUTRAM 2026 Engineering Workstream*

