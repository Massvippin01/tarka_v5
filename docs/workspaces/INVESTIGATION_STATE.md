# InvestigationState Projection

## 1. Overview

The `InvestigationStateService` aggregates and projects the entire investigative context for a given case into an immutable state snapshot. It provides the lead investigator and analyst with real-time epistemic health metrics, integrity distributions, and multi-source telemetry.

API Endpoint:
`GET /api/v1/investigations/{case_id}/state`

---

## 2. Epistemic Health & Telemetry Metrics

The snapshot encapsulates four primary sub-structures:

1. **Case Metadata**:
   - `case_id`: Unique case identifier (e.g., `CASE-2026-001`).
   - `title`: Formal investigation title.
   - `status`: Active investigation status.
   - `lead_investigator`: Assigned officer.
   - `jurisdiction`: Authorized legal jurisdiction.
   - `snapshot_time`: ISO-8601 UTC timestamp of projection generation.

2. **Source Telemetry Summary (`source_summary`)**:
   - `total_artifacts`: Number of registered evidence artifacts.
   - `total_bytes`: Aggregated byte size of content-addressed files.
   - `by_source_type`: Breakdown across 11 source adapter families (CDR, Tower Dump, Forensics UFED, Bank Statement, ANPR, WhatsApp, Vahan, NAFIS, OSINT, CCTV, Court Order).
   - `integrity_breakdown`: Artifact count by verification status (`VERIFIED`, `QUARANTINED`, `PENDING`).

3. **Epistemic Health Summary (`epistemic_summary`)**:
   - `total_facts`: Number of derived, immutable facts.
   - `total_observations`: Number of raw observations extracted from artifacts.
   - `total_claims`: Number of formalized claims in the case graph.
   - `corroborated_claims_count`: Claims backed by $\ge 2$ independent sources with 0 open contradictions.
   - `open_contradictions_count`: Active contradictions flagged by the kinematic/epistemic engines.
   - `critical_contradictions_count`: High-severity kinematic anomalies (e.g., impossible speed).
   - `open_evidence_gaps_count`: Missing foundational records identified by the deduction engine.
   - `critical_gaps_count`: Gaps blocking identity or ownership attribution.
   - `candidate_identity_matches_requiring_review`: Entities with phonetic/string similarity pending human adjudication.
   - `epistemic_disclaimer`: Mandatory legal notice affirming that all claims are probabilistic hypotheses based solely on available evidence.

4. **Hypothesis Matrix (`hypotheses`)**:
   - Projected working hypotheses, their formal codes (`H1`, `H2`), titles, supporting fact counts, and open gaps affecting hypothesis validity.

---

## 3. Epistemic Integrity Invariant

The investigation state snapshot enforces the following invariant:
> Every fact must link to at least one valid observation; every observation must link to a verified artifact in the CAS storage; every artifact must possess an unbroken chain-of-custody audit trail.
