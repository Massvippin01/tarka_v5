# SENTINELX NEXUS — Changelog

## [2.0.0] - 2026-08-30

### Added
- **Canonical Entity Models**: Implemented `Person` as canonical human entity with roles as relationships (`ACCUSED_IN`, `VICTIM_IN`, `WITNESS_IN`, `MEMBER_OF`, `CO_ACCUSED_WITH`).
- **Fact vs Intelligence Standard**: Added confidence levels (`CONFIRMED`, `DOCUMENTED`, `OBSERVED`, `REPORTED`, `INFERRED`, `POTENTIAL`) and full provenance tracking on all entities and relationships.
- **Dual Persistence Architecture**: Implemented `UnifiedStore` supporting in-memory transactional storage with lazy Neo4j Graph Database synchronization.
- **Synthetic Source Adapters**: Built adapter framework and connectors for 20+ synthetic Indian agency streams (CCTNS, ICJS, NCRP, NAFIS, AFRS, VAHAN, SARATHI, CEIR, IVFRT, e-Courts, e-Prisons, e-Forensics, ANPR, CDR, Financial).
- **Entity Resolution Engine**: Multi-feature candidate matching (Jaro-Winkler name similarity, exact Aadhaar/DL/Passport match, phone/vehicle overlap) returning score percentages and match explanations.
- **Ingestion Pipeline**: Pipeline handling validation, normalization, deduplication, ER candidate generation, and provenance logging.
- **Golden Vertical Slice & 100 Scenarios**: Designed Scenario 1 ("Cyber Mule Ring & Auto Theft Nexus" connecting Case C102 and C481) and built `ScenarioGenerator` for 100 golden benchmark scenarios across 20 families.
- **Graph Analytics & APIs**: Shortest path, k-hop expansion, PageRank, degree centrality, common neighbors, cross-case linkage REST endpoints.
- **Tool-Driven AI Investigation Copilot**: `AICopilotService` executing internal graph tools and generating evidence-backed answers citing exact record IDs and disclaimers.
- **Investigator UI**: Dark, professional React 19 + TypeScript + Vite frontend featuring Command Center with GIS map preview, Entity Dossier, Network Explorer, Cyber & Financial Intelligence, Data Quality & Governance, and Slide-out AI Copilot Drawer.
- **Automated Test Suite**: `backend/tests/test_nexus_suite.py` unit and integration tests passing 100%.
