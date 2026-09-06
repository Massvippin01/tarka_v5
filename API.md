# SENTINELX NEXUS — API Documentation

Base Endpoint: `http://localhost:8000/api/v1`

## Search & Command Endpoints (`/api/v1/investigation/search`)

### 1. Federated Investigative Search (POST)
- `POST /api/v1/investigation/search/federated`
- **Body**:
  ```json
  {
    "query": "DL-01-AB-1888",
    "entity_types": [],
    "jurisdiction": "Delhi NCR",
    "page_size": 20,
    "cursor": null
  }
  ```
- **Response**: `FederatedSearchResponse` containing 5-tier ranked result items, ER candidate summaries (`POSSIBLE MATCH 94%`), pagination cursors (`next_cursor`), source coverage status (`CCTNS: AVAILABLE`, `VAHAN: AVAILABLE`), and query duration telemetry.

### 2. Federated Investigative Search (GET)
- `GET /api/v1/investigation/search/federated?q={query}&page_size=20`
- Shortcut GET endpoint for global command search bar.

## Investigation & Graph Projection Endpoints (`/api/v1/investigation`)

### 3. Bounded Graph Projection (POST)
- `POST /api/v1/investigation/graph/projection`
- Returns bounded nodes, edges, cluster summaries, truncation metadata (`is_truncated`, `total_available_nodes`), data freshness, and query duration telemetry.

### 4. Primary Novelty #1: Relationship Inspector
- `GET /api/v1/investigation/relationship-inspector/{rel_id}`
- Returns WHY? explanation breakdown: relationship type, confidence level, observed time, source systems, supporting evidence citations, contradictory observations, alternative hypothesis, evidence gaps, and next verification steps.

### 5. Primary Novelty #2: Evidence Gaps & Contradictions
- `GET /api/v1/investigation/evidence-gaps/{case_id}`
- Returns identified evidence gaps, spatial/temporal contradictions, and recommended investigator actions.

### 6. Competing Hypotheses Matrix
- `GET /api/v1/investigation/hypotheses/{case_id}`
- Returns competing hypotheses (H1, H2, H3) with supporting and contradicting evidence mapping.

### 7. Entity Dossier Retrieval
- `GET /api/v1/investigation/dossier/{entity_id}`
- Returns complete dossier, 2-hop network graph, associated evidence, and provenance metadata.

### 8. AI Investigation Copilot Query
- `POST /api/v1/investigation/copilot`
- Body: `{"query": "Why does relationship rel-p1-p2 exist?"}`
- Returns evidence-backed answer, tool execution logs, confidence score, supporting records, and evidence citations.
