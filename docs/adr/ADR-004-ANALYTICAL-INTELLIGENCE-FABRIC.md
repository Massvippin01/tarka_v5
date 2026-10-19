# ADR-004: Multi-Dimensional Analytical Intelligence Fabric & Epistemic Standards

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: Criminal-intelligence platforms often return unexplained anomaly scores or infer legal guilt automatically, violating human-in-the-loop safeguards and creating unexplainable "black box" decisions.

## Decision
1. **Typed 21-Field Signal Contract**: Implement `AnalyticalSignal` in `analytics.py` requiring 21 comprehensive fields detailing WHAT, WHY, EVIDENCE CITATIONS, METHOD, CONFIDENCE, CONTRADICTIONS, GAPS, ALTERNATIVE EXPLANATIONS, and RECOMMENDED VERIFICATION.
2. **7-Dimension Analytical Engine**: Implement `AnalyticalEngine` (`analytical_engine.py`) covering:
   - Network Intelligence (Degree Centrality, PageRank, `CANDIDATE NETWORK`)
   - Cross-Case Correlation (Shared entities, vehicles, phones, locations, MOs)
   - Temporal Intelligence (Event sequences, temporal overlap)
   - Mobility Intelligence (ANPR trails, `OBSERVED` vs `INFERRED ROUTE`)
   - Financial Intelligence (Mule accounts, rapid transfers, `UNUSUAL FINANCIAL PATTERN`)
   - Behavioural / MO Intelligence (Modus operandi pattern similarity)
   - Hybrid Anomaly Engine (Multi-feature anomaly detection with explicit WHY explanation)
3. **Mandatory Epistemic Labeling Standards**:
   - `CANDIDATE NETWORK` (not Criminal Gang)
   - `UNUSUAL FINANCIAL PATTERN` (not Criminal Transaction)
   - `OBSERVED vs INFERRED ROUTE`
   - Confidence levels: `CONFIRMED`, `DOCUMENTED`, `OBSERVED`, `REPORTED`, `INFERRED`, `POTENTIAL`
4. **AI Reasoning Boundary**: Raw Data ➔ Analytical Engine ➔ Structured Signal ➔ Evidence Verification ➔ AI Copilot ➔ Human Investigator. The AI Copilot explains engine signals through typed tools rather than computing unverified scores by itself.
5. **Actionable UI Integration**: Build `AnalyticalContextPanel.tsx` in `InvestigationCanvas` Right Context Rail under `INTELLIGENCE` tab, with sub-tabs `[NETWORK]`, `[ANOMALIES]`, `[CROSS-CASE]`, `[TEMPORAL]`, `[FINANCIAL]`, `[MOBILITY]`.

## Consequences
- **Positive**:
  - Golden case cross-case signal (FIR C102 ↔ C481) generates 4-feature link with 89% inferred confidence, 1 contradiction, 1 gap, 1 alternative hypothesis, and exact evidence citations.
  - Signal generation latency p50 = 4.8ms.
