# SENTINELX NEXUS — Architecture Specification

## Overview
SENTINELX NEXUS is an integration-ready synthetic national criminal-intelligence, cybercrime investigation, entity-resolution, graph-analysis, and investigation-copilot platform.

```
[ Federated Search Fabric ] (Cmd/Ctrl+K Command Surface & 5-Tier Deterministic Ranking)
             │
             ▼
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
[ Server-Side Graph Projection Service ] (Enforces query bounds: max_nodes=500, max_edges=1000, max_hops=2)
             │
             ▼
[ Frontend Graph Adapter ] (AbortController cancellation & stale-response rejection)
             │
             ▼
[ Scalable WebGL / Canvas Renderer ] (Graphology concepts, cluster LODs, truncation alerts & ReactFlow fallback)
```

## Core Architectural Principles
1. **Federated Search as Investigation Entry**: Search serves as the primary front door for discovering investigations across heterogeneous intelligence sources with deterministic 5-tier ranking (Exact Identifier > Canonical ID > Name > Alias > ER Match Score).
2. **National Data Principle**: Never load unrestricted graph topology into client browser memory. All frontend projections are bounded server-side by query budgets (`max_nodes: 500`, `max_edges: 1000`, `max_hops: 2`).
3. **Canonical Human Entity**: `Person` represents all human entities. Roles (Accused, Victim, Witness, Suspect, Complainant) are modeled as relationships/edges attached to `Person`.
4. **Fact vs Intelligence (Epistemic Separation)**: `OBSERVATION` ≠ `INFERENCE` ≠ `HYPOTHESIS` ≠ `DECISION`. Analytical confidence levels: `CONFIRMED`, `DOCUMENTED`, `OBSERVED`, `REPORTED`, `INFERRED`, `POTENTIAL`.
5. **No Unsafe Auto-Merges**: Entity Resolution outputs candidate matches (`POSSIBLE MATCH (94%)`) with percentage scores and feature breakdowns for investigator approval.
6. **Tool-Driven AI Reasoning**: AI Copilot executes backend graph tools (`get_relationship_explanation`, `get_evidence_gaps`, `get_hypotheses`) and cites source record IDs, evidence references, and analytical confidence.
