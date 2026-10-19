# ADR-003: Federated Investigative Search Fabric & Command Surface

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: In heterogeneous national intelligence environments (CCTNS, NCRP, VAHAN, CDR, ANPR, Financial), search must serve as the primary front door for discovering investigations. Generic string queries fail to rank objective identifiers properly and disconnect search results from operational context.

## Decision
1. **Typed Search Contract**: Implement `FederatedSearchRequest` and `FederatedSearchResponse` in `search.py` supporting cursor pagination, source coverage reporting (`CCTNS: ONLINE`, `NCRP: ONLINE`, `VAHAN: ONLINE`), truncation alerts, and query duration telemetry.
2. **Federated Multi-Entity Query Engine**: Execute search across all 12 domain entity types in `UnifiedStore` (Persons, Phones, Vehicles, Accounts, Cases, FIRs, Evidence, ANPR, CDR, Transactions, Forensic Records, Cyber Indicators).
3. **Deterministic 5-Tier Ranking Standard**:
   - Tier 1 (100.0): Exact Identifier match (Aadhaar, DL, FIR number, Phone number, Plate, UPI VPA, Evidence ID)
   - Tier 2 (90.0): Exact Canonical ID match (`P001`, `C102`, `V188`, `PH001`, `ACC992`)
   - Tier 3 (80.0): Exact Name / Title match
   - Tier 4 (60.0): Strong Alias / Partial match
   - Tier 5: Entity Resolution candidate score (`POSSIBLE MATCH 94%`)
4. **Non-Destructive ER Candidate Integration**: Search results surface non-destructive ER match candidate summaries rather than silently auto-merging records.
5. **Keyboard-First Global Command Surface (`Cmd/Ctrl + K`)**: Implement `GlobalCommandSearch.tsx` modal grouping results into domain categories (**PEOPLE**, **CASES**, **VEHICLES**, **PHONES**, **EVIDENCE**, **TRANSACTIONS**) with direct quick actions (**OPEN INVESTIGATION**, **ASK COPILOT**).

## Consequences
- **Positive**:
  - Golden identifiers (`C102`, `P001`, `PH001`, `V188`, `ACC992`, `TXN001`, `EV-2026-101`) resolve deterministically with score 90-100.
  - Quick action `OPEN INVESTIGATION` instantly synchronizes Graph, Dossier, Timeline, GIS Map, and Copilot without page reloads.
  - Query latency p50 = 3.5ms.
