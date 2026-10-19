# Contradiction Center Projection

## 1. Purpose & Principle

In standard investigative software, conflicting reports are often silently suppressed, averaged, or merged. SentinelX treats contradictions as primary investigative assets. 

The **Contradiction Center** projects all detected inconsistencies, kinematic impossibilities, and conflicting claims without attempting automated resolution.

API Endpoint:
`GET /api/v1/investigations/{case_id}/contradictions`

---

## 2. Detection Types & Kinematic Anomaly Analysis

The Contradiction Center highlights anomalies across multiple investigative dimensions:

1. **Spatiotemporal Kinematic Impossibility**:
   - Compares paired observations across time and space.
   - Computes minimum transit velocity:
     $$v = \frac{\Delta d}{\Delta t}$$
   - **Golden Case Demonstration**:
     - Observation 1: CDR tower connection in South Delhi at 09:38.
     - Observation 2: ANPR camera detection at DND Toll Plaza at 09:41.
     - Transit time: 180 seconds. Physical distance: 18.2 km.
     - Calculated velocity: **364 km/h**.
     - Anomaly status: `CRITICAL` Kinematic Impossibility (exceeds urban road threshold of 140 km/h).
     - Working hypothesis: Device and vehicle were transported separately, or a burner phone was operated by a courier.

2. **Conflicting Claims**:
   - Statements or assertions that contradict physical, forensic, or financial records.

3. **Status Taxonomy**:
   - `ACTIVE`: Detected and verified contradiction; open for investigator analysis.
   - `UNDER_REVIEW`: Assigned to forensic field team for re-examination.
   - `RECONCILED`: Formally explained by a validated hypothesis (e.g., dual-device possession).

---

## 3. Procedural Verification & Statutory Actions

For each active contradiction, the center projects specific procedural actions:
- Request cell tower sector azimuth logs and RF timing advance data under **Section 91 CrPC / Section 94 BNSS**.
- Requisition optical ANPR timestamp server synchronization logs (NTP audit).
- Subpoena high-definition toll lane video footage for occupant visual identification.
