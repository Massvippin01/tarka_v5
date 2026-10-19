# SentinelX --- Technology Architecture

## Principle

SIH does not impose a mandatory technology stack. Technology is selected
against graph capability, AI/ML suitability, real-time processing,
scalability, security, interoperability, deployment feasibility and
maintainability.

## Reference architecture

``` text
Authorized Data Sources
↓
Secure Integration Layer
↓
Ingestion / Event Fabric
↓
Validation + Normalization
↓
Entity + Evidence Extraction
↓
Canonical Data Layer
├── PostgreSQL
├── Object Storage
└── OpenSearch where justified
↓
Neo4j Knowledge Graph
↓
Graph + Search + Temporal Analytics
↓
AI / ML Intelligence
↓
Evidence Verification
↓
Contradiction / Hard-Veto Engine
↓
Grounded AI Copilot + Voice
↓
Investigator Workspace
↓
Audit / Reports / Governance
```

## Reference stack

### Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   AntV G6 or equivalent
-   MapLibre GL or equivalent GIS

### Backend

-   Python
-   FastAPI
-   Pydantic
-   SQLAlchemy

### Data

-   PostgreSQL --- transactional/system-of-record metadata
-   Neo4j --- criminal-intelligence knowledge graph
-   S3-compatible object storage --- evidence artifacts
-   OpenSearch --- full-text/fuzzy/hybrid/vector retrieval where
    justified

### AI/ML

-   spaCy / transformers
-   deterministic + fuzzy entity resolution
-   transliteration/phonetic matching
-   validated anomaly models
-   Neo4j Graph Data Science
-   private/local LLM where deployment requirements demand it
-   embeddings for semantic retrieval

### Events

Kafka for production-scale event streaming where justified.

### Deployment

Docker for prototype; Kubernetes, HA/DR, observability, secret
management and infrastructure-as-code for production evolution.

## Voice

``` text
Microphone → VAD → Streaming STT → Intent/Entity Parsing
→ Authorization → Tool Execution → Evidence Verification
→ UI State Update → Streaming TTS
```

Use provider adapters.

## Government interoperability

CCTNS/ICJS and other systems are integration targets. Never fabricate
direct connectivity.

The supplied research emphasizes fragmented criminal-justice systems and
interoperable investigation/analytics. fileciteturn40file5L298-L317

## Prototype honesty

Demonstrate what exists.

Architect for future scale.

Do not claim national-scale production from a hackathon prototype.
