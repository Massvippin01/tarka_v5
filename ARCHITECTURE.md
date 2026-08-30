# SENTINELX NEXUS — Architecture Specification

## Overview
SENTINELX NEXUS is an integration-ready synthetic national criminal-intelligence, cybercrime investigation, entity-resolution, graph-analysis, and investigation-copilot platform.

```
[ Synthetic Source Adapters ] (CCTNS, ICJS, NCRP, VAHAN, CDR, ANPR, Financial)
             │
             ▼
[ BaseSourceAdapter / CanonicalRecord ]
             │
             ▼
[ Ingestion Pipeline ] ──> [ Entity Resolution Engine ] (Non-destructive ER match)
             │
             ▼
[ Dual Persistence Layer ]
   ├── System-of-Record Store (UnifiedStore / PostgreSQL)
   └── Knowledge Graph Engine (Neo4j Cypher & Graph Algorithms)
             │
             ▼
[ AI Investigation Copilot & REST API Layer ]
             │
             ▼
[ Dark Professional Investigator Workspace UI ] (React 19 / Vite / ReactFlow)
```

## Core Architectural Principles
1. **Canonical Human Entity**: `Person` represents all human entities. Roles (Accused, Victim, Witness, Suspect, Complainant) are modeled as relationships/edges attached to `Person`.
2. **Fact vs Intelligence**: Strict distinction between raw facts and analytical inferences. Confidence levels: `CONFIRMED`, `DOCUMENTED`, `OBSERVED`, `REPORTED`, `INFERRED`, `POTENTIAL`.
3. **No Unsafe Auto-Merges**: Entity Resolution outputs match candidates with percentage scores and feature breakdowns for investigator approval.
4. **Tool-Driven AI Reasoning**: AI Copilot executes backend graph tools and cites source record IDs, evidence references, and analytical confidence.
5. **Polyglot & Synthetic Compliance**: Operational investigative universe is synthetic; adapters expose integration interfaces ready for authorized system connections.
