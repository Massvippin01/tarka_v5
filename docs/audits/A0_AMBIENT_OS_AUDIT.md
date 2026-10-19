# SENTINELX — SUBPHASE A0: AMBIENT INVESTIGATION OS AUDIT
**Document ID**: `docs/audits/A0_AMBIENT_OS_AUDIT.md`  
**Status**: APPROVED ARCHITECTURAL BASELINE & SPECIFICATION AUDIT  
**Date**: October 2026  
**Auditor**: Principal Product Architect & Staff Systems Engineers  
**Target Milestone**: Ambient Investigation Operating System Evolution (Subphases A0–A20)  
**Baseline Test Verification**: 410/410 Tests Passed | Frontend Production Build Clean (818ms)

---

## 1. Executive Summary & Mission Alignment

SentinelX is evolving from a **forensic investigation dashboard with a voice-command interface** into an **ambient investigation operating system** where the investigator naturally speaks, types, clicks, searches, navigates, inspects, correlates, and reasons across the entire authorized investigation.

### 1.1 The Operational Invariants (Non-Negotiable)
1. **AI Proposes → Evidence Verifies → Human Decides**: The human investigator remains the sovereign authority. Machine learning surfaces leads and topological correlations; evidence grounds all assertions; humans confirm consequential actions.
2. **Authoritative State Hierarchy**:
   - **PostgreSQL** is the sole transactional system of record for cases, evidence artifacts, observations, claims, custody records, contradictions, gaps, and audit logs.
   - **Neo4j** is the graph projection and graph intelligence layer, deriving all topology from canonical PostgreSQL state.
   - **Raw evidence bytes** and **SHA-256 digests** are immutable. Provenance and epistemic standing cannot be altered by UI or voice shortcuts.
3. **Governed Execution Gateway**:
   - Every user modality (Ambient Voice, Keyboard/Text, Mouse/Click, Command Palette `Ctrl+K`, Agent Supervisory Tasks) must converge through the exact same pipeline:
     $$	ext{Intent} \longrightarrow 	ext{Context} \longrightarrow 	ext{PolicyGateway} \longrightarrow 	ext{CommandBus} \longrightarrow 	ext{Validation Mesh} \longrightarrow 	ext{Execution} \longrightarrow 	ext{AuditService}$$
   - No modality may bypass authorization, case scoping, or tamper-evident audit logging.

---

## 2. Video & Mockup UX Extraction

An in-depth analysis was conducted across:
- **Reference Video**: `SentinelX – AI Investigative Intelligence & Entity Resolution Platform _ Smart India Hackathon.mp4` (25.5 MB)
- **UI/UX Master Specifications**: `SentinelX_World_Class_UIUX_Spec` (Specs 00 through 13)
- **Production Screen Mockups**: `frontend/stitch_sentinelx_operational_intelligence_platform`

### 2.1 Screen Hierarchy & Layout System
- **Single-Page Cohesion**: The application maintains a persistent operational desk (`Investigation Workspace`). The investigator never feels disoriented by full-page context shifts.
- **Top Application Bar**:
  - Global Search / Command Palette (`Ctrl+K` shortcut).
  - Ambient Voice Pill / State Communicator (displaying exact state, waveform on user speech, quick toggle).
  - Active Case Badge (`CASE-2026-001 / Operation Triad Nexus`), Security Clearance (`SECRET / LEVEL-4`), Active User Profile (`INV-2026-99`).
- **Primary Viewport (Multi-Lens Workspace)**:
  - **Overview**: High-level investigative objective, priority leads, unverified claims, network summary.
  - **Network (Graph)**: Full topological graph canvas with interactive pan, zoom, fit, filter controls, and minimap.
  - **Timeline**: Chronological multi-track event sequence (calls, sightings, financial movements, FIR filings).
  - **Map (GIS)**: Spatial coordinates, geofences, ANPR cameras, cell tower triangulation.
  - **Evidence**: Authoritative artifact repository, SHA-256 hashes, chain of custody logs, 65B forensic certificates.
  - **Contradiction Center**: Live discrepancy detector showing conflicting observations, severity ratings, and source attributions.
  - **Findings / Dossier**: Structured suspect and entity intelligence dossiers with verified vs inferred connections.
- **Contextual Slide-Over Drawers (360px–480px)**:
  - **Entity Inspector**: Quick preview before opening full dossier.
  - **Relationship Inspector**: Reveals evidence count, confidence, validity period, supporting vs contradicting artifacts.
  - **Evidence Drawer**: Slide-over viewer preserving active graph context while inspecting source documents.

### 2.2 Visual Hierarchy & Information Density
- **Dark Enterprise Intelligence Palette**: `#081018` (Background) → `#0D1721` (Surface) → `#111E2A` (Elevated Surface) → `#243342` (Border).
- **Prohibitions Upheld**: No neon cyberpunk glows, no opaque glassmorphism obscuring text, no rainbow-colored confusion, no icon-only controls without labels or accessible tooltips.
- **Multi-Channel Semantic Encoding**: Color is never the sole carrier of meaning.
  - *Observed*: Solid edge + circle node + [OBSERVED] badge.
  - *Verified*: High-contrast teal `#31C4D8` + double stroke + shield icon.
  - *Inferred*: Dashed edge `#E6B85C` + diamond node + [INFERRED] badge.
  - *Contradicted*: Crosshatch / warning amber-red `#E26D78` + conflict triangle + [CONTRADICTED] badge.
  - *Proposed*: Dotted edge + preview marker.

---

## 3. Repository Graph & Data Authority Audit

### 3.1 Twelve Core Architectural Inquiries
1. **How Neo4j is currently populated**:
   - Seeded via `seed.py` / `UnifiedStore` graph loader. During live operation, changes are accepted by `UnifiedStore` and can be pushed to Neo4j via `Neo4jRepository.execute_write`.
2. **Whether PostgreSQL is authoritative**:
   - **YES**. `backend/app/database/models.py` contains the authoritative SQLAlchemy models: `CaseModel`, `EvidenceArtifactModel`, `EvidenceObservationModel`, `EvidenceFactModel`, `EvidenceCustodyRecordModel`, `EvidenceClaimModel`, `EvidenceContradictionModel`, `EvidenceGapModel`, `EntityModel`, `RelationshipModel`, `AuditEventModel`.
3. **Whether Neo4j is a projection**:
   - **YES**. Neo4j is an analytical projection and query acceleration engine. All writes must first commit to PostgreSQL transactional state before projecting into graph nodes and relationships.
4. **How nodes are normalized**:
   - Standardized in `app/graph/graph_schema.py` and `app/domain/entity.py`. Node families include `Person`, `Case`, `FIR`, `Phone`, `Device`, `Vehicle`, `Location`, `Organization`, `Account`, `Transaction`, `Document`, `Evidence`, `Event`.
5. **How relationships are normalized**:
   - Typed edges in `app/domain/relationship.py` including `KNOWS`, `CALLS`, `MESSAGES`, `USES`, `OWNS`, `REGISTERED_TO`, `LOCATED_AT`, `VISITED`, `CONNECTED_TO`, `WORKS_FOR`, `TRANSFERRED_TO`, `ASSOCIATED_WITH`, `MENTIONED_IN`, `SUPPORTED_BY`, `CONTRADICTED_BY`.
6. **How graph queries are currently exposed**:
   - REST endpoints in `app/api/graph.py` (`/pagerank`, `/centrality`, `/communities`, `/similarity`, `/shortest-path`, `/common-connections`, `/temporal`) and `app/api/investigation.py` (`/projection` via `GraphProjectionService`).
7. **How frontend graph data is currently fetched**:
   - `graphProjectionAdapter.ts` issues POST requests to `/api/v1/investigation/graph/projection` with bounded scope parameters (`case_id`, `root_entity_id`, `max_hops`, `max_nodes`, `min_confidence`).
8. **Whether graph updates can be streamed**:
   - *Current State*: **No incremental streaming**. When filters or nodes change, the client re-fetches the entire bounded projection.
   - *Target Evolution (Subphases A6–A7)*: Event-driven incremental streaming via WebSockets/SSE (`GRAPH_NODE_CREATED`, `GRAPH_RELATIONSHIP_CREATED`, `GRAPH_NODE_UPDATED`, etc.).
9. **Existing indexes and constraints**:
   - Defined in `app/graph/graph_schema.py`: 13 unique constraints on node IDs (`p:Person.id`, `c:Case.id`, etc.) and 8 indexes on lookup keys (`person_name`, `person_aadhaar`, `vehicle_registration`, `phone_number`, etc.).
10. **Existing graph algorithms**:
    - `GraphAlgorithms` in `app/graph/graph_algorithms.py` provides: `shortest_path`, `k_hop_expansion`, `common_neighbors`, `degree_centrality`, `page_rank`, `community_detection`, `temporal_filtered_subgraph`. All algorithms include epistemic safety warnings ("Association != Guilt").
11. **Existing graph fixtures**:
    - Seed fixtures in `tests/test_nexus_suite.py` and `tests/test_milestone2_intelligence_graph.py` featuring `CASE-2026-001`, `P001` (Vikramaditya Singhania), `P002`, `V001`, `PHONE001`.
12. **Existing frontend graph components**:
    - `@xyflow/react` in `features/graph/GraphExplorer.tsx` and custom HTML5 Canvas / WebGL bounded renderer in `components/WebGLGraphExplorer.tsx`.

---

## 4. Ambient Voice Architecture & State Machine Gap Audit

### 4.1 Ambient Voice Philosophy: Ready vs Listening
- **Browser Security & Consent**: A web browser cannot silently capture raw microphone audio without investigator awareness.
- **Three Consent Tiers**:
  1. *Permission Granted*: System stays in `VOICE_READY`. The audio engine listens locally for speech onset (VAD) or investigator click. Audio is never continuously streamed to the server without an active turn.
  2. *Permission Not Granted*: System presents a clear, prominent microphone enablement affordance in the top bar.
  3. *Permission Denied / Ineligible*: System cleanly falls back to keyboard/text prompt (`Ctrl+K` or investigative command bar).

### 4.2 State Machine Gap Analysis
- *Existing State Model* (9 states): `MIC_OFF`, `CONNECTING`, `LISTENING`, `PROCESSING`, `SPEAKING`, `INTERRUPTED`, `RECONNECTING`, `DEGRADED`, `ERROR`.
- *Required 14-State Ambient Machine*:
  1. `READY` (Permission granted, idle, zero audio streaming, waiting for speech onset or button tap)
  2. `LISTENING` (Active capture engaged, mic open)
  3. `USER SPEAKING` (VAD detected human voice, streaming audio frames)
  4. `TRANSCRIBING` (Real-time STT converting phonemes to text)
  5. `UNDERSTANDING` (Semantic intent parsing, entity extraction, context resolution)
  6. `EXECUTING` (Policy check passed, CommandBus executing action)
  7. `SHOWING RESULT` (UI state transitioning, graph focusing, drawer opening)
  8. `SPEAKING` (Streaming TTS audio playback to investigator)
  9. `INTERRUPTED` (Investigator barge-in detected, immediately truncating TTS)
  10. `WAITING FOR CLARIFICATION` (Ambiguous reference; prompt requesting specific entity)
  11. `WAITING FOR CONFIRMATION` (High-risk action requiring explicit affirmative response)
  12. `OFFLINE` (Network disconnected; local fallback operational)
  13. `MICROPHONE DENIED` (Browser denied mic permission; text prompt auto-focused)
  14. `ERROR` (Operational failure; specific error surfaced with recovery suggestion)

---

## 5. Natural Language Semantic Intent Gap Audit

### 5.1 Beyond the 14 Benchmark Commands
The previous 14 commands (`OPEN_CASE`, `CONTINUE_INVESTIGATION`, `SHOW_CONTRADICTIONS`, `SHOW_EVIDENCE`, `SHOW_TIMELINE`, `SHOW_MISSING_EVIDENCE`, `SHOW_PERSON`, `TRACE_PERSON`, `GO_BACK`, `SUMMARIZE_REVIEWED`, etc.) served as the baseline test vocabulary.

In the Ambient OS, the assistant must generalize to open-ended investigative reasoning requests:
- *"Show me everything connected to P001."*
- *"Why is this person connected to this case?"*
- *"Find all vehicles associated with these entities."*
- *"Compare the movements between these two subjects."*
- *"What changed since yesterday?"*
- *"Show me the strongest unexplained connection."*
- *"Trace this relationship back to the source evidence."*
- *"Which evidence supports this relationship?"*
- *"Which claims are contradicted?"*
- *"Show me the missing evidence."*
- *"Open the timeline around 11:42 PM."*
- *"Zoom into this cluster."*
- *"Expand this person's network."*
- *"Hide unrelated entities."*
- *"Only show verified relationships."*
- *"Group these entities."*
- *"Find common phone numbers."*

### 5.2 Eight Request Classes
Every request must be classified into one of eight canonical request classes:
1. `EXECUTABLE_INVESTIGATION_REQUEST`
2. `INFORMATIONAL_REQUEST`
3. `NAVIGATION_REQUEST`
4. `CLARIFICATION_REQUIRED`
5. `CONFIRMATION_REQUIRED`
6. `UNAUTHORIZED_REQUEST`
7. `UNSUPPORTED_REQUEST`
8. `OUT_OF_SCOPE_REQUEST`

### 5.3 Contextual Follow-Up Resolution (Anaphora & Deixis)
Investigators reason sequentially:
- Investigator: *"Show P001."* → Focuses `P001`.
- Investigator: *"What is he connected to?"* → Resolves "he" → `P001`.
- Investigator: *"Only vehicles."* → Preserves `target=P001`, applies `entity_filter=['Vehicle']`.
- Investigator: *"Now show the strongest connection."* → Analyzes highest confidence edge on `P001`.
- Investigator: *"Why?"* → Explains evidence grounding for the selected relationship.
- Investigator: *"Trace it back."* → Opens provenance drawer for source artifacts.
- Investigator: *"Go back."* → Pops context stack to previous graph state.

---

## 6. Realtime Transport & Proof Panel Audit

### 6.1 Data Ingestion Architecture
- Adapters ingest external data (CCTNS, e-Courts, Vahan, ANPR, CDR, e-Forensics).
- Every event preserves raw bytes, SHA-256 checksums, and source provenance.
- Ingestion pipeline:
  $$	ext{Source Event} \longrightarrow 	ext{Adapter} \longrightarrow 	ext{Evidence IR} \longrightarrow 	ext{Entity Resolution} \longrightarrow 	ext{PostgreSQL} \longrightarrow 	ext{Neo4j Projection} \longrightarrow 	ext{WebSocket Event} \longrightarrow 	ext{Frontend Graph}$$

### 6.2 Realtime Proof Panel
- An expandable forensic diagnostics panel providing verifiable audit trails:
  - Event ID & Timestamp.
  - Source Subsystem (e.g. `ANPR-DELHI-SOUTH`, `CDR-TELCO-GATEWAY`).
  - Ingestion Latency (ms) & Processing Latency (ms).
  - Canonical Evidence Hash (SHA-256).
  - Entity Resolution Match Confidence.
  - Neo4j Graph Projection Transaction ID.
  - Frontend DOM / Canvas Render Latency (ms).

---

## 7. Roadmap & Detailed Plan for Subphase A1: AMBIENT VOICE STATE MACHINE

### 7.1 Scope of Subphase A1
1. **Domain Models**:
   - Update `VoiceSessionStatus`, `VoiceTurnStatus`, and introduce `AmbientVoiceState` in `backend/app/domain/voice.py` containing the exact 14 states.
   - Enforce rigorous state transition validation table (prevent invalid transitions, e.g. from `OFFLINE` directly to `USER_SPEAKING`).
2. **Frontend State & UI Orchestration**:
   - Update `VoiceUIState` in `frontend/src/types/voice.ts` with all 14 states.
   - Upgrade `VoiceCommandOverlay.tsx` with discrete, non-generic visual representations for all 14 states (visual waveforms, status badges, pulsating indicators, prompt dialogues).
   - Implement explicit permission handling:
     - `PERMISSION GRANTED` → transitions to `READY` (idle, zero continuous upload).
     - `PERMISSION NOT GRANTED` → prominent "Enable Ambient Voice" affordance.
     - `PERMISSION DENIED` → `MICROPHONE_DENIED` with automatic keyboard focus.
   - Client-side VAD (Voice Activity Detection) using Web Audio API `AudioContext` and `AnalyserNode` to transition between `READY`, `LISTENING`, and `USER SPEAKING`.
3. **Backend API Endpoints**:
   - Add `/api/v1/voice/ambient/status` and `/api/v1/voice/ambient/transition` endpoints to validate and monitor ambient sessions.
4. **Verification & Testing**:
   - Unit tests covering all 14 state transitions and illegal transition rejections.
   - Integration tests simulating permission grant, VAD speech onset, transcription, execution, TTS speech, and barge-in.
   - Full regression run of the existing 410 backend tests and frontend production build.

---

## 8. Subphase A0 Sign-Off & Freeze

Subphase A0 is complete. No functional code has been modified during this audit phase. The repository baseline is verified green:
- **Backend**: 410 / 410 tests passing.
- **Frontend**: Production build clean (0 errors, 818ms).
- **Architecture**: Invariants locked and documented.
