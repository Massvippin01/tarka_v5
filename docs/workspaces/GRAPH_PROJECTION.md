# Intelligence Graph Projection

## 1. Overview

The Graph Projection provides an interactive, evidence-grounded topological representation of an active case. It projects entities, relationships, observations, and claims without violating the core epistemic boundary between association and guilt.

API Endpoint:
`GET /api/v1/investigations/{case_id}/graph`

---

## 2. Graph Ontology Boundaries

The intelligence graph projection enforces strict boundaries between observational reality and investigative assertion:

1. **Entity Nodes**:
   - Entities represent real-world actors, infrastructure, vehicles, accounts, or communication identifiers (e.g., `PERSON`, `PHONE`, `VEHICLE`, `BANK_ACCOUNT`, `LOCATION`).
   - Visualized with distinct iconography and categorical badges.
   - Node badges display degree centrality as **observational density**, not criminal importance.

2. **Relationship Edges**:
   - Edges represent observed interactions (`CALLED`, `LOCATED_AT`, `REGISTERED_TO`, `TRANSFERRED_FUNDS`, `SEEN_NEAR`).
   - Every edge carries an array of `evidence_ids` linking directly to the underlying observations and facts.
   - Uncorroborated relationships are visually distinct (dashed lines, amber badges) from corroborated links (solid lines, cyan badges).

3. **Ambiguous Identity Handling**:
   - When entity resolution identifies candidates with similarity scores $\in [0.70, 0.99]$ (such as "Vikram Singh" vs "Bikram Sing"), the system **never** automatically merges the nodes.
   - Nodes are rendered separately, joined by a dotted `CANDIDATE_IDENTITY_MATCH` edge requiring manual investigator verification.

4. **Ephemeral Claims Projection**:
   - Claims can be toggled as hyper-nodes linking multiple entities and facts, highlighting supporting and refuting branches directly on the canvas.

---

## 3. Projection Invariants

- **Zero Graph Mutation**: Moving nodes, expanding clusters, or toggling lenses in the UI has zero mutation effect on the underlying evidence database.
- **Traceability Guarantee**: Clicking any edge or node in the graph explorer provides immediate navigation to the supporting observations and raw content-addressed artifacts.
