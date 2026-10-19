# SentinelX --- Intelligence, Evidence & Trust UX

## Trust model

Separate: **Observation → Inference → Recommendation → Investigator
decision**

Never collapse them into one AI statement.

## Intelligence pipeline

``` text
Raw source
↓
Normalization
↓
Entity extraction
↓
Entity resolution
↓
Graph relationship
↓
Analytical signal
↓
Investigative lead
↓
Evidence verification
↓
Human review
↓
Investigator finding
```

## Evidence states

-   Corroborated
-   Supported
-   Partially supported
-   Unverified
-   Contradicted
-   Insufficient evidence
-   Requires human review

## Provenance

Important AI results expose: - source - record ID - timestamp -
originating system - evidence type - extraction method - entity
linkage - relevant relationship - integrity/hash where applicable

## Entity resolution

Potential signals: - deterministic identifiers - normalization -
transliteration - phonetic matching - fuzzy similarity - contextual
similarity - graph corroboration

Show uncertainty explicitly.

## Graph analytics

Potential: - centrality - community detection - shortest path -
similarity - temporal change - anomaly detection - validated link
prediction

Analytics create leads; they do not establish guilt.

## AI Copilot response

Every answer should expose:

``` text
Answer
Why
Evidence
Sources
Graph Context
Contradictions
Confidence
Status
```

## Audit

Track: - login - search - view - upload - edit - entity link - AI
query - AI lead - evidence access - report generation - export -
permission changes

## Human boundary

System may: - retrieve - correlate - rank - visualize - explain -
suggest

System must not: - declare guilt - make arrest decisions - silently
modify evidence - silently resolve contradictions - autonomously export
sensitive information - silently add high-impact watchlist entries
