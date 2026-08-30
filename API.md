# SENTINELX NEXUS — API Documentation

Base Endpoint: `http://localhost:8000/api/v1`

## Investigation Endpoints (`/api/v1/investigation`)

### 1. Seed Golden Vertical Slice
- `POST /api/v1/investigation/seed-golden-slice`
- Seeds primary vertical slice scenario (Case C102 & C481 nexus).

### 2. List Golden Scenarios
- `GET /api/v1/investigation/scenarios`
- Returns 100 golden benchmark investigation scenarios across 20 scenario families.

### 3. Entity Dossier Retrieval
- `GET /api/v1/investigation/dossier/{entity_id}`
- Returns complete dossier, 2-hop network graph, associated evidence, and provenance metadata.

### 4. Shortest Path & Linkage Analysis
- `GET /api/v1/investigation/path?source={source_id}&target={target_id}`
- Returns shortest path, connecting entities, path confidence, and analytical provenance.

### 5. K-Hop Graph Expansion
- `GET /api/v1/investigation/k-hop/{node_id}?k=2`
- Returns sub-graph nodes and edges up to `k` hops.

### 6. AI Investigation Copilot Query
- `POST /api/v1/investigation/copilot`
- Body: `{"query": "What connects Case C102 and Case C481?"}`
- Returns answer, tool execution logs, confidence score, supporting records, and evidence citations.

### 7. Data Quality Audit
- `GET /api/v1/investigation/quality`
- Returns completeness, ER match rate, orphan count, and recent ingestion batch report.

## Explorer & Graph Endpoints (`/api/v1/explorer`, `/api/v1/graph`)
- `GET /api/v1/explorer/graph`: Returns complete graph nodes & edges.
- `GET /api/v1/explorer/search?q={query}`: Universal entity search.
- `GET /api/v1/persons`: List / create person entities.
- `GET /api/v1/cases`: List / create police cases.
