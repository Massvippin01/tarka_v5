# Investigation Delta Projection

## 1. Overview & Append-Only Differential Semantics

The **Investigation Delta Projection** computes and displays changes between investigation state snapshots. It enables senior supervisory officers and case analysts to audit how new evidence alters the case landscape over time.

API Endpoint:
`GET /api/v1/investigations/{case_id}/delta`

---

## 2. Strict Append-Only Differential Rules

In a forensic intelligence platform, deletion of evidence is an evidentiary violation. SentinelX enforces append-only delta semantics:

1. **Zero Deletions**:
   - Entities, observations, facts, and artifacts are never deleted.
   - The delta reports additions (`new_entities`, `new_relationships`, `new_observations`).

2. **Epistemic State Transitions**:
   - If new evidence challenges an existing claim, the claim is not removed or overwritten.
   - The delta logs a status transition (e.g., from `PLAUSIBLE` to `CONTRADICTED` or `CORROBORATED`), citing the newly ingested corroborating or contradicting facts.

3. **Emergent Contradictions & Gaps**:
   - Any newly arisen spatiotemporal conflict or missing KYC requirement triggered by incoming data is highlighted in the delta summary.

4. **Hypothesis Impact Vector**:
   - Computes the delta impact on working hypotheses ($H_1, H_2$):
     - `supporting_facts_added`: Number of new evidentiary anchors reinforcing the hypothesis.
     - `open_gaps_affecting`: Number of unresolved documentation requirements.

---

## 3. Mandatory Audit Notice

Every delta payload and UI view includes the mandatory audit notice:
> **APPEND-ONLY FORENSIC GUARANTEE**: Evidence ledger is immutable. No records have been deleted or overwritten. All state transitions are historically auditable.
